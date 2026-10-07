import type { ToolcraftComponentAcceptance } from "./acceptance/types";
import { metalAcceptance } from "../metal/metal-acceptance";
import { metalReadiness, metalSectionInventory, metalTransferMode } from "../metal/metal-inventory";

export const appTransferMode = metalTransferMode;

export const appProductReadiness = metalReadiness;

export const appAcceptance: readonly ToolcraftComponentAcceptance[] = metalAcceptance;

// Product entries use the same explicit stable section IDs as appSchema.
export const appControlSectionInventory = metalSectionInventory;
