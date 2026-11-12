// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

// Samo deklaracije. Pravila i značenje rezultata definirani su u docs/SPEC.md.
interface IStanToken is IERC20 {
    // Transfer i Approval naslijeđeni su iz IERC20 bez promjene potpisa.
    event ApartmentAssigned(uint256 indexed apartmentId, address indexed owner);
    event ApartmentRevoked(uint256 indexed apartmentId, address indexed previousOwner);
    event DeputyChanged(address indexed previousDeputy, address indexed newDeputy);
    event TakeoverRequested(uint256 indexed takeoverId, address indexed requester, uint256 executableAt);
    event TakeoverCancelled(uint256 indexed takeoverId);
    event RepresentativeChanged(address indexed previousRepresentative, address indexed newRepresentative);

    event VotingModuleLinked(address indexed module);

    /// @notice Predstavnik: jednokratno povezuje modul s ovim tokenom. SPEC: K25.
    function setVotingModule(address module) external;

    /// @notice Svi: povezani modul ili nulta adresa prije povezivanja. SPEC: K25.
    function votingModule() external view returns (address);

    /// @notice Uloga: Svi (čitanje). SPEC: K41.
    function name() external view returns (string memory);

    /// @notice Uloga: Svi (čitanje). SPEC: K41.
    function symbol() external view returns (string memory);

    /// @notice Uloga: Svi (čitanje). SPEC: K1, K41.
    function decimals() external view returns (uint8);

    /// @notice Uloga: Svi (čitanje). SPEC: K1, K6, K35, K41.
    function totalSupply() external view returns (uint256);

    /// @notice Uloga: Svi (čitanje). SPEC: K1, K5, K24, K41.
    function balanceOf(address account) external view returns (uint256);

    /// @notice Uloga: Svi (čitanje). SPEC: K4, K41.
    function allowance(address owner, address spender) external view returns (uint256);

    /// @notice Uloga: Nitko; poziv se odbija s Token nije prenosiv. SPEC: K4.
    function transfer(address to, uint256 value) external returns (bool);

    /// @notice Uloga: Nitko; poziv se odbija s Token nije prenosiv. SPEC: K4.
    function approve(address spender, uint256 value) external returns (bool);

    /// @notice Uloga: Nitko; poziv se odbija s Token nije prenosiv. SPEC: K4.
    function transferFrom(address from, address to, uint256 value) external returns (bool);

    /// @notice Uloga: Predstavnik. SPEC: K1, K2, K3, K6, K24, K25, K26.
    function assignApartment(uint256 apartmentId, address owner) external;

    /// @notice Uloga: Predstavnik. SPEC: K6, K25, K26.
    function revokeApartment(uint256 apartmentId) external;

    /// @notice Uloga: Svi (čitanje). SPEC: K1, K6, K24, K41.
    function ownerOfApartment(uint256 apartmentId) external view returns (address);

    /// @notice Uloga: Svi (čitanje). SPEC: K37, K39.
    function representative() external view returns (address);

    /// @notice Uloga: Svi (čitanje). SPEC: K37, K39.
    function deputy() external view returns (address);

    /// @notice Uloga: Predstavnik. SPEC: K39.
    function setDeputy(address newDeputy) external;

    /// @notice Uloga: Predstavnik. SPEC: K39.
    function transferRepresentative(address newRepresentative) external;

    /// @notice Uloga: Zamjenik. SPEC: K37.
    function requestTakeover(uint256 takeoverId) external;

    /// @notice Uloga: Predstavnik. SPEC: K37.
    function cancelTakeover(uint256 takeoverId) external;

    /// @notice Uloga: Zamjenik. SPEC: K37, K39.
    function completeTakeover(uint256 takeoverId) external;
}

interface IStanModul {
    /// @notice Svi: nepromjenjiva adresa tokena iz konstruktora. SPEC: K25.
    function tokenAddress() external view returns (address);

    /// @notice Svi: postoji li upravo aktivan krug (pocetak <= sada < rok). SPEC: K25, K27.
    function isRoundActive() external view returns (bool);

    enum RoundType { Priority, TieBreak, Approval }
    enum RoundOutcome { NoVotes, Tied, WinnerSelected, Accepted, Rejected }

    struct RoundResults {
        RoundType roundType;
        RoundOutcome outcome;
        uint256[] proposalIds;
        uint256[] supportCounts;
        uint256 participationCount;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256[] leadingProposalIds;
    }

    event ProposalSubmitted(uint256 indexed proposalId, uint256 indexed apartmentId, address indexed author);
    event RoundStarted(uint256 indexed roundId, RoundType roundType, uint256[] proposalIds, uint256 startTime, uint256 endTime);
    event PrioritiesSubmitted(uint256 indexed roundId, uint256 indexed apartmentId, uint256[] proposalIds);
    event TieBreakVoteSubmitted(uint256 indexed roundId, uint256 indexed apartmentId, uint256 indexed proposalId);
    event ApprovalVoteSubmitted(uint256 indexed roundId, uint256 indexed apartmentId, uint8 choice);

    /// @notice Uloga: Suvlasnik s pravom za zadani stan; predstavnik i zamjenik samo uz isto pravo. SPEC: K7, K34.
    function submitProposal(uint256 apartmentId, string calldata title, string calldata description) external returns (uint256 proposalId);

    /// @notice Uloga: Predstavnik. SPEC: K8, K23, K28, K32, K33, K40.
    function startPriorityRound(uint256[] calldata proposalIds, uint256 startTime, uint256 endTime) external returns (uint256 roundId);

    /// @notice Uloga: Suvlasnik s pravom za zadani stan; predstavnik i zamjenik samo uz isto pravo. SPEC: K5, K9, K10, K11, K12, K18, K19, K20, K24, K27.
    function votePriorities(uint256 roundId, uint256 apartmentId, uint256[] calldata proposalIds) external;

    /// @notice Uloga: Predstavnik. SPEC: K8, K13, K23, K28, K29, K32, K40.
    function startTieBreakRound(uint256 previousRoundId, uint256[] calldata proposalIds, uint256 startTime, uint256 endTime) external returns (uint256 roundId);

    /// @notice Uloga: Suvlasnik s pravom za zadani stan; predstavnik i zamjenik samo uz isto pravo. SPEC: K5, K12, K13, K14, K18, K19, K20, K24, K27, K29.
    /// @dev Niz mora sadržavati točno jedan ID; inače Odaberite jedan prijedlog.
    function voteTieBreak(uint256 roundId, uint256 apartmentId, uint256[] calldata proposalIds) external;

    /// @notice Uloga: Predstavnik. SPEC: K8, K23, K28, K30, K31, K32, K36, K40.
    function startApprovalRound(uint256 proposalId, uint256 startTime, uint256 endTime) external returns (uint256 roundId);

    /// @notice Uloga: Suvlasnik s pravom za zadani stan; predstavnik i zamjenik samo uz isto pravo. SPEC: K5, K12, K18, K19, K20, K24, K27, K35.
    /// @dev choice: 0 = PROTIV, 1 = ZA; ostale vrijednosti nisu valjane.
    function voteApproval(uint256 roundId, uint256 apartmentId, uint8 choice) external;

    /// @notice Uloga: Predstavnik ili adresa s barem jednim važećim pravom za stan; tek nakon roka. SPEC: K15, K16, K17, K21, K26, K27, K28, K29, K30, K31, K35, K38.
    function getRoundResults(uint256 roundId) external view returns (RoundResults memory results);

    /// @notice Uloga: Predstavnik. SPEC: K22.
    function getNonVoters(uint256 roundId) external view returns (uint256[] memory apartmentIds);
}
