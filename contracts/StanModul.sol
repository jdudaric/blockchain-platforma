// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {IStanToken, IStanModul} from "./IStan.sol";

/// @notice Glasanje 25 stanova; javni podaci na lancu nisu tajni.
contract StanModul is IStanModul {
    struct Proposal {
        uint256 apartmentId;
        address author;
        string title;
        string description;
        uint256 submittedAt;
        uint256 rejectedUntil;
        bool accepted;
    }
    struct Round {
        RoundType kind;
        uint256 cycleId;
        uint256 previousRoundId;
        uint256 start;
        uint256 end;
        uint256[] candidates;
        uint256 participation;
        uint256 votesFor;
        uint256 votesAgainst;
        mapping(uint256 => bool) voted;
        mapping(uint256 => uint256) support;
        // Pohranjeni izbori ostaju nepromijenjeni i nakon promjene vlasnika.
        mapping(uint256 => uint256[]) selections;
        mapping(uint256 => uint8) choices;
    }

    IStanToken private immutable _token;
    mapping(uint256 => Proposal) private _proposals;
    mapping(uint256 => Round) private _rounds;
    mapping(uint256 => uint256) private _activeCounts;
    uint256[] private _activeProposals; // Najvise 25 * 3; povijest je u _proposals.
    uint256[] private _cycleCandidates;
    uint256[] private _ranking;
    uint256 private _cycleCount;
    uint256 private _proposalCount;
    uint256 private _lastRound;
    uint256 private _settledRound;
    uint256 private _priorityRound;
    uint256 private _approvalIndex;
    bool private _cycleOpen;
    bool private _rankingReady;

    /// @notice Adresa vec postavljenog tokena; komunikacija samo kroz IStanToken. SPEC: K25, K40.
    constructor(address initialToken) {
        require(initialToken.code.length != 0, "Neispravna adresa");
        _token = IStanToken(initialToken);
        require(_token.representative() != address(0), "Neispravna adresa");
    }

    /// @dev Uvijek cita aktualnu ulogu iz tokena. SPEC: K8, K37, K39.
    modifier onlyRepresentative() {
        require(msg.sender == _token.representative(), "Samo predstavnik");
        _;
    }

    /// @notice Svi: nepromjenjiva adresa tokena za provjeru povezivanja. SPEC: K25.
    function tokenAddress() external view override returns (address) { return address(_token); }

    /// @notice Svi: aktivan znaci pocetak <= sada < rok; zakazani krug jos nije aktivan. SPEC: K25, K27.
    function isRoundActive() external view override returns (bool) {
        Round storage r = _rounds[_lastRound];
        return _lastRound != 0 && r.start <= block.timestamp && block.timestamp < r.end;
    }

    /// @notice Suvlasnik predlaze bez otvaranja glasanja. SPEC: K7, K20, K34.
    function submitProposal(uint256 apartmentId, string calldata title, string calldata description)
        external override returns (uint256 proposalId)
    {
        _requireRight(apartmentId);
        _sync();
        require(bytes(title).length != 0 && bytes(description).length != 0, "Nepotpun prijedlog");
        require(_activeCounts[apartmentId] < 3, "Previse aktivnih prijedloga");
        require(bytes(title).length <= 400 && bytes(description).length <= 4000, "Predug prijedlog");
        require(_unicodeLength(bytes(title)) <= 100 && _unicodeLength(bytes(description)) <= 1000, "Predug prijedlog");
        proposalId = ++_proposalCount;
        _proposals[proposalId] = Proposal(apartmentId, msg.sender, title, description, block.timestamp, 0, false);
        _activeProposals.push(proposalId);
        ++_activeCounts[apartmentId];
        emit ProposalSubmitted(proposalId, apartmentId, msg.sender);
    }

    /// @notice Predstavnik ukljucuje cijeli skup raspolozivih prijedloga. SPEC: K8, K23, K28, K32, K33, K40.
    function startPriorityRound(uint256[] calldata proposalIds, uint256 startTime, uint256 endTime)
        external override onlyRepresentative returns (uint256 roundId)
    {
        _requireLinked();
        _sync();
        _requireNoPendingRound();
        _requireTimes(startTime, endTime);
        require(proposalIds.length != 0, "Nema prijedloga");
        _requireExistingDistinct(proposalIds);
        if (_cycleOpen) {
            Round storage previous = _rounds[_lastRound];
            require(previous.kind == RoundType.Priority && previous.participation == 0, "Ciklus nije zavrsen");
            require(_sameSet(proposalIds, _cycleCandidates), "Nepotpun skup prijedloga");
        } else {
            uint256 eligible;
            for (uint256 i; i < _activeProposals.length; ++i) {
                uint256 id = _activeProposals[i];
                if (_proposals[id].rejectedUntil <= block.timestamp) {
                    ++eligible;
                    require(_contains(proposalIds, id), "Nepotpun skup prijedloga");
                }
            }
            for (uint256 i; i < proposalIds.length; ++i) {
                Proposal storage p = _proposals[proposalIds[i]];
                require(!p.accepted, "Prijedlog nije raspoloziv");
                require(p.rejectedUntil <= block.timestamp, "Projekt je u zabrani");
            }
            require(eligible == proposalIds.length, "Nepotpun skup prijedloga");
            ++_cycleCount;
            _cycleCandidates = proposalIds;
            _cycleOpen = true;
            _rankingReady = false;
            _approvalIndex = 0;
            delete _ranking;
        }
        roundId = _newRound(RoundType.Priority, proposalIds, startTime, endTime);
        _priorityRound = roundId;
    }

    /// @notice Jedan konacan skup od 1 do 3 razlicita prioriteta po stanu. SPEC: K5, K9, K10, K11, K12, K18, K19, K20, K24, K27.
    function votePriorities(uint256 roundId, uint256 apartmentId, uint256[] calldata proposalIds) external override {
        _requireVote(roundId, apartmentId, RoundType.Priority);
        require(proposalIds.length != 0, "Odaberite prijedlog");
        require(proposalIds.length <= 3, "Najvise 3 prijedloga");
        Round storage r = _rounds[roundId];
        for (uint256 i; i < proposalIds.length; ++i) {
            require(_contains(r.candidates, proposalIds[i]), "Prijedlog nije u glasanju");
            for (uint256 j; j < i; ++j) require(proposalIds[j] != proposalIds[i], "Prijedlog je ponovljen");
            ++r.support[proposalIds[i]];
        }
        r.selections[apartmentId] = proposalIds;
        r.voted[apartmentId] = true;
        ++r.participation;
        emit PrioritiesSubmitted(roundId, apartmentId, proposalIds);
    }

    /// @notice Razrjesava samo izjednacene prvoplasirane, nakon isteka prethodnog kruga. SPEC: K8, K13, K23, K28, K29, K32, K40.
    function startTieBreakRound(uint256 previousRoundId, uint256[] calldata proposalIds, uint256 startTime, uint256 endTime)
        external override onlyRepresentative returns (uint256 roundId)
    {
        _requireLinked();
        _requireRound(previousRoundId);
        Round storage previous = _rounds[previousRoundId];
        require(block.timestamp >= previous.end, "Prethodno glasanje nije zavrseno");
        _sync();
        require(_cycleOpen && previousRoundId == _lastRound && previous.kind != RoundType.Approval && !_rankingReady, "Nema izjednacenja");
        RoundResults memory result = _results(previousRoundId);
        // Prazan dodatni krug ne razrjesava prethodno izjednacenje.
        uint256[] memory candidates = result.leadingProposalIds;
        if (previous.kind == RoundType.TieBreak && previous.participation == 0) candidates = previous.candidates;
        require(candidates.length > 1, "Nema izjednacenja");
        require(_sameSet(proposalIds, candidates), "Neispravni kandidati");
        _requireTimes(startTime, endTime);
        roundId = _newRound(RoundType.TieBreak, proposalIds, startTime, endTime);
    }

    /// @notice Jedan izbor u dodatnom krugu. SPEC: K5, K12, K13, K14, K18, K19, K20, K24, K27, K29.
    function voteTieBreak(uint256 roundId, uint256 apartmentId, uint256[] calldata proposalIds) external override {
        _requireVote(roundId, apartmentId, RoundType.TieBreak);
        require(proposalIds.length == 1, "Odaberite jedan prijedlog");
        Round storage r = _rounds[roundId];
        require(_contains(r.candidates, proposalIds[0]), "Prijedlog nije u glasanju");
        ++r.support[proposalIds[0]];
        r.selections[apartmentId] = proposalIds;
        r.voted[apartmentId] = true;
        ++r.participation;
        emit TieBreakVoteSubmitted(roundId, apartmentId, proposalIds[0]);
    }

    /// @notice Pokrece samo sljedeci projekt na rang-listi. SPEC: K8, K23, K28, K30, K31, K32, K36, K40.
    function startApprovalRound(uint256 proposalId, uint256 startTime, uint256 endTime)
        external override onlyRepresentative returns (uint256 roundId)
    {
        _requireLinked();
        _sync();
        _requireNoPendingRound();
        require(_cycleOpen, "Ciklus nije otvoren");
        require(_rankingReady, "Prioritet nije odredjen");
        require(proposalId != 0 && proposalId <= _proposalCount, "Prijedlog ne postoji");
        require(_proposals[proposalId].rejectedUntil <= block.timestamp, "Projekt je u zabrani");
        require(proposalId == _ranking[_approvalIndex], "Projekt nije sljedeci");
        _requireTimes(startTime, endTime);
        uint256[] memory candidate = new uint256[](1);
        candidate[0] = proposalId;
        roundId = _newRound(RoundType.Approval, candidate, startTime, endTime);
    }

    /// @notice Konacan glas: 0 PROTIV ili 1 ZA. SPEC: K5, K12, K18, K19, K20, K24, K27, K35.
    function voteApproval(uint256 roundId, uint256 apartmentId, uint8 choice) external override {
        _requireVote(roundId, apartmentId, RoundType.Approval);
        require(choice <= 1, "Neispravan glas");
        Round storage r = _rounds[roundId];
        if (choice == 1) ++r.votesFor;
        else ++r.votesAgainst;
        r.choices[apartmentId] = choice;
        r.voted[apartmentId] = true;
        ++r.participation;
        emit ApprovalVoteSubmitted(roundId, apartmentId, choice);
    }

    /// @notice Rezultati nakon isteka, bez finalizacijske transakcije. SPEC: K15, K16, K17, K21, K26, K27, K28, K29, K30, K31, K35, K38.
    function getRoundResults(uint256 roundId) external view override returns (RoundResults memory results) {
        require(msg.sender == _token.representative() || _token.balanceOf(msg.sender) > 0, "Nema prava za rezultate");
        _requireRound(roundId);
        require(block.timestamp >= _rounds[roundId].end, "Rezultati jos nisu dostupni");
        return _results(roundId);
    }

    /// @notice Predstavnik vidi ID-eve svih 25 stanova koji nisu glasali. SPEC: K17, K22, K35.
    function getNonVoters(uint256 roundId) external view override onlyRepresentative returns (uint256[] memory apartmentIds) {
        _requireRound(roundId);
        Round storage r = _rounds[roundId];
        apartmentIds = new uint256[](25 - r.participation);
        uint256 index;
        for (uint256 id = 1; id <= 25; ++id) if (!r.voted[id]) apartmentIds[index++] = id;
    }

    /// @dev Provjera prava uvijek je po stanu, ne samo po saldu. SPEC: K6, K20, K24.
    function _requireRight(uint256 apartmentId) private view {
        require(apartmentId >= 1 && apartmentId <= 25, "Nema prava za stan");
        require(_token.ownerOfApartment(apartmentId) == msg.sender, "Nema prava za stan");
    }

    /// @dev Bez povezivanja s tokenom nema pokretanja krugova. SPEC: K25.
    function _requireLinked() private view {
        require(_token.votingModule() == address(this), "Modul nije povezan");
    }

    /// @dev ID-evi su uzastopni i pocinju s 1. SPEC: K18, K21, K22.
    function _requireRound(uint256 roundId) private view {
        require(roundId != 0 && roundId <= _lastRound, "Glasanje ne postoji");
    }

    /// @dev Ovlast, vrsta, vrijeme pa konacnost glasa. SPEC: K12, K18, K19, K20, K24.
    function _requireVote(uint256 roundId, uint256 apartmentId, RoundType kind) private view {
        _requireRound(roundId);
        _requireRight(apartmentId);
        Round storage r = _rounds[roundId];
        require(r.kind == kind, "Pogresna vrsta glasanja");
        require(block.timestamp >= r.start, "Glasanje nije pocelo");
        require(block.timestamp < r.end, "Glasanje je zavrseno");
        require(!r.voted[apartmentId], "Stan je vec glasao");
    }

    /// @dev Zakazani i aktivni krug onemogucuju otvaranje drugog. SPEC: K40.
    function _requireNoPendingRound() private view {
        require(_lastRound == 0 || block.timestamp >= _rounds[_lastRound].end, "Prethodno glasanje nije zavrseno");
    }

    /// @dev Trajanje nije fiksno; rok mora biti buduci i nakon pocetka. SPEC: K23, K32.
    function _requireTimes(uint256 startTime, uint256 endTime) private view {
        require(endTime > startTime && endTime > block.timestamp, "Neispravan rok");
        // Povijesni pocetak ne smije stvoriti preklapanje vec zavrsenih krugova.
        require(_lastRound == 0 || startTime >= _rounds[_lastRound].end, "Preklapanje glasanja");
    }

    /// @dev Jedino mjesto stvaranja; ne postoji put za promjenu roka. SPEC: K32, K40.
    function _newRound(RoundType kind, uint256[] memory candidates, uint256 startTime, uint256 endTime)
        private returns (uint256 id)
    {
        uint256 previous = _lastRound;
        id = ++_lastRound;
        Round storage r = _rounds[id];
        r.cycleId = _cycleCount;
        r.previousRoundId = previous != 0 && _rounds[previous].cycleId == _cycleCount ? previous : 0;
        r.kind = kind;
        r.candidates = candidates;
        r.start = startTime;
        r.end = endTime;
        emit RoundStarted(id, kind, candidates, startTime, endTime);
    }

    /// @dev Lijena administrativna obrada; view rezultat ne ovisi o pozivu ove funkcije. SPEC: K27, K28, K30, K31, K34, K36, K40.
    function _sync() private {
        if (_lastRound == 0 || _settledRound == _lastRound || block.timestamp < _rounds[_lastRound].end) return;
        _settledRound = _lastRound;
        Round storage r = _rounds[_lastRound];
        if (r.kind == RoundType.Approval) {
            uint256 id = r.candidates[0];
            if (r.votesFor >= 13) {
                Proposal storage p = _proposals[id];
                p.accepted = true;
                --_activeCounts[p.apartmentId];
                for (uint256 i; i < _activeProposals.length; ++i) {
                    if (_activeProposals[i] == id) {
                        _activeProposals[i] = _activeProposals[_activeProposals.length - 1];
                        _activeProposals.pop();
                        break;
                    }
                }
                _cycleOpen = false;
            } else {
                _proposals[id].rejectedUntil = r.end + 90 days;
                ++_approvalIndex;
                if (_approvalIndex == _ranking.length) _cycleOpen = false;
            }
        } else {
            RoundResults memory result = _results(_lastRound);
            if (result.outcome == RoundOutcome.WinnerSelected) {
                // Dodatni krug bira pobjednika. Ostali zadrzavaju poredak prioriteta.
                uint256[] memory ordered = _sorted(_priorityRound);
                uint256 winner = result.leadingProposalIds[0];
                uint256 pos;
                while (ordered[pos] != winner) ++pos;
                for (uint256 i = pos; i > 0; --i) ordered[i] = ordered[i - 1];
                ordered[0] = winner;
                _ranking = ordered;
                _rankingReady = true;
            }
        }
    }

    /// @dev Racuna rezultate i bez prethodne obrade isteka. SPEC: K15, K16, K17, K27, K28, K29, K35.
    function _results(uint256 roundId) private view returns (RoundResults memory result) {
        Round storage r = _rounds[roundId];
        result.roundType = r.kind;
        result.participationCount = r.participation;
        if (r.kind == RoundType.Approval) {
            result.proposalIds = r.candidates;
            result.supportCounts = new uint256[](0);
            result.leadingProposalIds = new uint256[](0);
            result.votesFor = r.votesFor;
            result.votesAgainst = r.votesAgainst;
            result.outcome = r.votesFor >= 13 ? RoundOutcome.Accepted : RoundOutcome.Rejected;
        } else {
            result.proposalIds = _sorted(roundId);
            uint256 n = result.proposalIds.length;
            result.supportCounts = new uint256[](n);
            for (uint256 i; i < n; ++i) result.supportCounts[i] = r.support[result.proposalIds[i]];
            if (r.participation == 0) {
                result.outcome = RoundOutcome.NoVotes;
                result.leadingProposalIds = new uint256[](0);
            } else {
                uint256 leaders = 1;
                while (leaders < n && result.supportCounts[leaders] == result.supportCounts[0]) ++leaders;
                result.leadingProposalIds = new uint256[](leaders);
                for (uint256 i; i < leaders; ++i) result.leadingProposalIds[i] = result.proposalIds[i];
                result.outcome = leaders == 1 ? RoundOutcome.WinnerSelected : RoundOutcome.Tied;
            }
        }
    }

    /// @dev Najvise 75 kandidata: potpore silazno, vrijeme pa ID uzlazno. SPEC: K28, K34.
    function _sorted(uint256 roundId) private view returns (uint256[] memory ids) {
        Round storage r = _rounds[roundId];
        ids = r.candidates;
        for (uint256 i = 1; i < ids.length; ++i) {
            uint256 key = ids[i];
            uint256 j = i;
            while (j > 0 && _before(key, ids[j - 1], roundId)) {
                ids[j] = ids[j - 1];
                --j;
            }
            ids[j] = key;
        }
    }

    /// @dev Deterministicka usporedba; ne razrjesava poslovno izjednacenje prvog mjesta. SPEC: K28.
    function _before(uint256 a, uint256 b, uint256 roundId) private view returns (bool) {
        Round storage r = _rounds[roundId];
        if (r.support[a] != r.support[b]) return r.support[a] > r.support[b];
        if (_proposals[a].submittedAt != _proposals[b].submittedAt) return _proposals[a].submittedAt < _proposals[b].submittedAt;
        return a < b;
    }

    /// @dev Skup kandidata ne smije sadrzavati nepoznate ni ponovljene ID-eve. SPEC: K33.
    function _requireExistingDistinct(uint256[] calldata ids) private view {
        for (uint256 i; i < ids.length; ++i) {
            require(ids[i] != 0 && ids[i] <= _proposalCount, "Prijedlog ne postoji");
            for (uint256 j; j < i; ++j) require(ids[j] != ids[i], "Prijedlog je ponovljen");
        }
    }

    /// @dev Redoslijed ulaza ne mijenja pripadnost skupu. SPEC: K13, K29, K33.
    function _sameSet(uint256[] memory a, uint256[] memory b) private pure returns (bool) {
        if (a.length != b.length) return false;
        for (uint256 i; i < a.length; ++i) {
            if (!_contains(b, a[i])) return false;
            for (uint256 j; j < i; ++j) if (a[j] == a[i]) return false;
        }
        return true;
    }

    /// @dev Provjera pripadnosti skupu kandidata. SPEC: K9, K13, K33.
    function _contains(uint256[] memory ids, uint256 id) private pure returns (bool) {
        for (uint256 i; i < ids.length; ++i) if (ids[i] == id) return true;
        return false;
    }

    /// @dev Broji Unicode skalarne vrijednosti; odbija nevaljan UTF-8. SPEC: K34.
    function _unicodeLength(bytes memory value) private pure returns (uint256 count) {
        uint256 i;
        while (i < value.length) {
            uint8 first = uint8(value[i]);
            uint256 width;
            if (first < 0x80) width = 1;
            else if (first >= 0xc2 && first <= 0xdf) width = 2;
            else if (first >= 0xe0 && first <= 0xef) width = 3;
            else if (first >= 0xf0 && first <= 0xf4) width = 4;
            else revert("Neispravan tekst");
            require(i + width <= value.length, "Neispravan tekst");
            for (uint256 j = 1; j < width; ++j) {
                uint8 next = uint8(value[i + j]);
                require(next >= 0x80 && next <= 0xbf, "Neispravan tekst");
            }
            if (width >= 3) {
                uint8 second = uint8(value[i + 1]);
                require(first != 0xe0 || second >= 0xa0, "Neispravan tekst");
                require(first != 0xed || second <= 0x9f, "Neispravan tekst");
                require(first != 0xf0 || second >= 0x90, "Neispravan tekst");
                require(first != 0xf4 || second <= 0x8f, "Neispravan tekst");
            }
            i += width;
            ++count;
        }
    }
}
