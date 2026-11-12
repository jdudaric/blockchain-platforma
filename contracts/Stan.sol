// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {IStanToken, IStanModul} from "./IStan.sol";

/// @notice Evidencija jednog neprenosivog STN prava za svaki od 25 stanova.
contract Stan is ERC20, Ownable, IStanToken {
    // ID stana -> ovlaštena adresa; nulta adresa znači da pravo nije dodijeljeno.
    mapping(uint256 => address) private _apartmentOwners;
    // Pamti sve ikad korištene ID-eve postupaka, čak i nakon otkazivanja.
    mapping(uint256 => bool) private _usedTakeoverIds;
    // private ne stvara javnu funkciju čitanja; podatak ipak nije tajan na blockchainu.
    address private _deputy;
    IStanModul private _votingModule;
    // ID 0 označava da trenutačno nema zahtjeva za preuzimanje.
    uint256 private _activeTakeoverId;
    // Unix vrijeme u sekundama od kojeg je dopušten dovršetak preuzimanja.
    uint256 private _executableAt;

    /// @notice Početni predstavnik je postavljač; zamjenik mora biti druga, nenulta adresa. SPEC: K39.
    constructor(address initialDeputy) ERC20("Stan", "STN") Ownable(msg.sender) {
        require(initialDeputy != address(0) && initialDeputy != msg.sender, "Neispravna adresa");
        _deputy = initialDeputy;
        emit RepresentativeChanged(address(0), msg.sender);
        emit DeputyChanged(address(0), initialDeputy);
    }

    /// @dev Samo predstavnik prolazi provjeru; _; nastavlja tijelo pozvane funkcije. SPEC: K3, K6, K37, K39.
    modifier onlyRepresentative() {
        require(msg.sender == owner(), "Samo predstavnik");
        _;
    }

    /// @dev Samo trenutačni zamjenik može pokrenuti ili dovršiti preuzimanje. SPEC: K37.
    modifier onlyDeputy() {
        require(msg.sender == _deputy, "Samo zamjenik");
        _;
    }

    /// @notice Svi: broj decimala je uvijek nula. SPEC: K1, K41.
    function decimals() public pure override(ERC20, IStanToken) returns (uint8) { return 0; }

    /// @notice Svi: naziv tokena. SPEC: K41.
    function name() public view override(ERC20, IStanToken) returns (string memory) { return super.name(); }

    /// @notice Svi: oznaka tokena. SPEC: K41.
    function symbol() public view override(ERC20, IStanToken) returns (string memory) { return super.symbol(); }

    /// @notice Svi: trenutačno izdani STN. SPEC: K1, K6, K35, K41.
    function totalSupply() public view override(ERC20, IStanToken) returns (uint256) { return super.totalSupply(); }

    /// @notice Svi: broj prava adrese. SPEC: K1, K5, K24, K41.
    function balanceOf(address account) public view override(ERC20, IStanToken) returns (uint256) { return super.balanceOf(account); }

    /// @notice Svi: nema dopuštenja prijenosa. SPEC: K4, K41.
    function allowance(address, address) public pure override(ERC20, IStanToken) returns (uint256) { return 0; }

    /// @notice Nitko: odbija i nulti iznos. SPEC: K4.
    function transfer(address, uint256) public pure override(ERC20, IStanToken) returns (bool) { revert("Token nije prenosiv"); }

    /// @notice Nitko: odbija svako odobrenje. SPEC: K4.
    function approve(address, uint256) public pure override(ERC20, IStanToken) returns (bool) { revert("Token nije prenosiv"); }

    /// @notice Nitko: odbija i poziv bez prethodnog odobrenja. SPEC: K4.
    function transferFrom(address, address, uint256) public pure override(ERC20, IStanToken) returns (bool) { revert("Token nije prenosiv"); }

    /// @notice Predstavnik: dodjeljuje jedno pravo slobodnom stanu. SPEC: K1, K2, K3, K6, K24, K25, K26.
    function assignApartment(uint256 apartmentId, address apartmentOwner) external override onlyRepresentative {
        _requireNoActiveRound();
        _requireApartment(apartmentId);
        require(_apartmentOwners[apartmentId] == address(0), "Stan vec ima token");
        require(apartmentOwner != address(0), "Neispravna adresa");
        _apartmentOwners[apartmentId] = apartmentOwner;
        // ERC20 povećava saldo vlasnika i ukupnu količinu za 1 te emitira Transfer.
        _mint(apartmentOwner, 1);
        emit ApartmentAssigned(apartmentId, apartmentOwner);
    }

    /// @notice Predstavnik: ukida pravo i uništava pripadajući STN. SPEC: K6, K25, K26.
    function revokeApartment(uint256 apartmentId) external override onlyRepresentative {
        _requireNoActiveRound();
        _requireApartment(apartmentId);
        address previousOwner = _apartmentOwners[apartmentId];
        require(previousOwner != address(0), "Stan nema token");
        // delete vraća adresu u početnu vrijednost address(0).
        delete _apartmentOwners[apartmentId];
        // ERC20 smanjuje saldo i ukupnu količinu za 1 te emitira Transfer.
        _burn(previousOwner, 1);
        emit ApartmentRevoked(apartmentId, previousOwner);
    }

    /// @notice Svi: vlasnik poznatog stana ili nulta adresa. SPEC: K1, K6, K24, K41.
    function ownerOfApartment(uint256 apartmentId) external view override returns (address) {
        _requireApartment(apartmentId);
        return _apartmentOwners[apartmentId];
    }

    /// @notice Svi: ista adresa kao Ownable owner(). SPEC: K37, K39.
    function representative() external view override returns (address) { return owner(); }

    /// @notice Svi: imenovani zamjenik, odnosno nulta adresa nakon preuzimanja. SPEC: K37, K39.
    function deputy() external view override returns (address) { return _deputy; }

    /// @notice Predstavnik: imenuje drugog zamjenika i otkazuje stari postupak. SPEC: K39.
    function setDeputy(address newDeputy) external override onlyRepresentative {
        require(newDeputy != address(0) && newDeputy != owner() && newDeputy != _deputy, "Neispravna adresa");
        _cancelActiveTakeover();
        _changeDeputy(newDeputy);
    }

    /// @notice Predstavnik: dobrovoljno prenosi ulogu. SPEC: K39.
    function transferRepresentative(address newRepresentative) external override onlyRepresentative {
        _changeRepresentative(newRepresentative);
    }

    /// @notice Predstavnik: naslijeđeni naziv iste radnje prijenosa. SPEC: K39.
    function transferOwnership(address newOwner) public override onlyRepresentative {
        _changeRepresentative(newOwner);
    }

    /// @notice Nitko: predstavnik se ne može odreći uloge bez nasljednika. SPEC: K39.
    function renounceOwnership() public view override onlyRepresentative { revert("Odricanje nije dopusteno"); }

    /// @notice Zamjenik: pokreće sedam dana čekanja s novim ID-em. SPEC: K37.
    function requestTakeover(uint256 takeoverId) external override onlyDeputy {
        require(_activeTakeoverId == 0, "Preuzimanje je pokrenuto");
        require(takeoverId != 0, "Neispravan ID preuzimanja");
        require(!_usedTakeoverIds[takeoverId], "ID preuzimanja je iskoristen");
        _usedTakeoverIds[takeoverId] = true;
        _activeTakeoverId = takeoverId;
        _executableAt = block.timestamp + 7 days;
        emit TakeoverRequested(takeoverId, msg.sender, _executableAt);
    }

    /// @notice Predstavnik: otkazuje odgovarajući zahtjev prije isteka čekanja. SPEC: K37.
    function cancelTakeover(uint256 takeoverId) external override onlyRepresentative {
        _requireTakeover(takeoverId);
        require(block.timestamp < _executableAt, "Rok za otkazivanje je istekao");
        _cancelActiveTakeover();
    }

    /// @notice Zamjenik: od trenutka isteka čekanja preuzima ulogu. SPEC: K37, K39.
    function completeTakeover(uint256 takeoverId) external override onlyDeputy {
        _requireTakeover(takeoverId);
        require(block.timestamp >= _executableAt, "Cekanje nije zavrseno");
        // Dovršeni postupak nije otkazan; ne emitira TakeoverCancelled.
        delete _activeTakeoverId;
        delete _executableAt;
        _changeRepresentative(msg.sender);
    }

    /// @dev Unutarnja provjera: dopušta samo postojeće stanove 1–25. SPEC: K1, K6, K41.
    function _requireApartment(uint256 apartmentId) internal pure {
        require(apartmentId >= 1 && apartmentId <= 25, "Stan ne postoji");
    }

    /// @dev Unutarnja provjera: traženi ID mora odgovarati aktivnom postupku. SPEC: K37.
    function _requireTakeover(uint256 takeoverId) internal view {
        require(takeoverId != 0 && takeoverId == _activeTakeoverId, "Nema preuzimanja");
    }

    /// @dev Sprema novu adresu zamjenika i bilježi promjenu; pozivatelj provjerava ovlasti/adresu. SPEC: K37, K39.
    function _changeDeputy(address newDeputy) internal {
        address previousDeputy = _deputy;
        _deputy = newDeputy;
        emit DeputyChanged(previousDeputy, newDeputy);
    }

    /// @dev Ako zahtjev postoji, prazni ga i bilježi otkazivanje; iskorišten ID ostaje zauzet. SPEC: K37, K39.
    function _cancelActiveTakeover() internal {
        if (_activeTakeoverId != 0) {
            uint256 cancelledId = _activeTakeoverId;
            delete _activeTakeoverId;
            delete _executableAt;
            emit TakeoverCancelled(cancelledId);
        }
    }

    /// @dev Zajednički prijenos uloge: otkazuje stari zahtjev, usklađuje zamjenika i Ownable vlasnika. SPEC: K37, K39.
    function _changeRepresentative(address newRepresentative) internal {
        require(newRepresentative != address(0) && newRepresentative != owner(), "Neispravna adresa");
        _cancelActiveTakeover();
        if (newRepresentative == _deputy) _changeDeputy(address(0));
        address previousRepresentative = owner();
        _transferOwnership(newRepresentative);
        emit RepresentativeChanged(previousRepresentative, newRepresentative);
    }

    /// @notice Predstavnik: jednokratna veza, bez mogucnosti zamjene usred glasanja. SPEC: K25.
    function setVotingModule(address module) external override onlyRepresentative {
        require(address(_votingModule) == address(0), "Modul je vec povezan");
        require(module.code.length != 0, "Neispravna adresa");
        try IStanModul(module).tokenAddress() returns (address linkedToken) {
            require(linkedToken == address(this), "Neispravan token modula");
        } catch { revert("Neispravan modul"); }
        // Provjeri i citanje statusa prije trajnog povezivanja.
        try IStanModul(module).isRoundActive() returns (bool active) {
            require(!active, "Modul je aktivan");
        } catch { revert("Neispravan modul"); }
        _votingModule = IStanModul(module);
        emit VotingModuleLinked(module);
    }

    /// @notice Svi: trenutan modul ili nulta adresa prije povezivanja. SPEC: K25.
    function votingModule() external view override returns (address) { return address(_votingModule); }

    /// @dev Stvarna aktivnost dolazi iz jednokratno povezanog modula. SPEC: K25, K27.
    function _isRoundActive() internal view virtual returns (bool) {
        return address(_votingModule) != address(0) && _votingModule.isRoundActive();
    }

    /// @dev Blokira dodjelu i oduzimanje ako provjera vrati aktivan krug. SPEC: K25.
    function _requireNoActiveRound() internal view {
        require(!_isRoundActive(), "Promjena prava nije dopustena tijekom glasanja");
    }

    /// @dev Dodatna zaštita: dopušteni su samo izdavanje i uništavanje. SPEC: K4.
    function _update(address from, address to, uint256 value) internal override {
        require(from == address(0) || to == address(0), "Token nije prenosiv");
        // Izdavanje: from je 0; uništavanje: to je 0. Zatim ERC20 ažurira salda.
        super._update(from, to, value);
    }
}
