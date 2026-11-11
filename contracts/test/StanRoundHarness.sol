// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.24;
import {Stan} from "../Stan.sol";

/// @dev Isključivo testni ugovor; nije modul niti ugovor za postavljanje na Sepoliju.
contract StanRoundHarness is Stan {
    bool private _active;
    constructor(address initialDeputy) Stan(initialDeputy) {}
    function setActiveForTest(bool active) external { _active = active; }
    function _isRoundActive() internal view override returns (bool) { return _active; }
}
