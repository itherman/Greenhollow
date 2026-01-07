import type { DialogChoice } from "../../core/dialog";
import type { AreaId } from "../../core/areas";

const AREA_TRAVEL_BLOCKS: Partial<Record<AreaId, string>> = {
  river_village: "sail_river_village",
  shadow_forest: "sail_shadow_forest",
  troll_bridge: "sail_troll_bridge",
};

export function filterTravelChoices(choices: DialogChoice[], areaId?: AreaId): DialogChoice[] {
  const blocked = areaId ? AREA_TRAVEL_BLOCKS[areaId] : undefined;
  if (!blocked) return choices;
  return choices.filter((choice) => choice.id !== blocked);
}
