// SINH TỰ ĐỘNG cho PLAN mục 204 (xem dòng Kết quả của mục đó): danh sách 44 chương chiến dịch
// theo đúng thứ tự Book 1 chương 1–20, Book 2 chương 1–21, rồi ba phần Endgame — thứ tự này khớp
// `data/chapter_objectives.json` và bản trích atlas trong `data/reference/fe3/`.
// File chỉ giữ nguồn JSON và thứ tự; việc kiểm và dựng state do `loadChapterData` trong
// `chapterData.ts` làm, nên không có vòng import giữa hai file.
import type { MapData } from '../grid/types';

import chapter01TalysChapter from '../../../data/chapters/chapter_01_talys.json' with { type: 'json' };
import chapter01TalysMap from '../../../data/maps/chapter_01_talys.json' with { type: 'json' };
import chapter02GalderChapter from '../../../data/chapters/chapter_02_galder.json' with { type: 'json' };
import chapter02GalderMap from '../../../data/maps/chapter_02_galder.json' with { type: 'json' };
import chapter03DevilMountainChapter from '../../../data/chapters/chapter_03_devil_mountain.json' with { type: 'json' };
import chapter03DevilMountainMap from '../../../data/maps/chapter_03_devil_mountain.json' with { type: 'json' };
import chapter04ChampionsOfAurelisChapter from '../../../data/chapters/chapter_04_champions_of_aurelis.json' with { type: 'json' };
import chapter04ChampionsOfAurelisMap from '../../../data/maps/chapter_04_champions_of_aurelis.json' with { type: 'json' };
import chapter05FireEmblemChapter from '../../../data/chapters/chapter_05_fire_emblem.json' with { type: 'json' };
import chapter05FireEmblemMap from '../../../data/maps/chapter_05_fire_emblem.json' with { type: 'json' };
import chapter06LefcandithGauntletChapter from '../../../data/chapters/chapter_06_lefcandith_gauntlet.json' with { type: 'json' };
import chapter06LefcandithGauntletMap from '../../../data/maps/chapter_06_lefcandith_gauntlet.json' with { type: 'json' };
import chapter07PortWarrenChapter from '../../../data/chapters/chapter_07_port_warren.json' with { type: 'json' };
import chapter07PortWarrenMap from '../../../data/maps/chapter_07_port_warren.json' with { type: 'json' };
import chapter08PrincessMinervaChapter from '../../../data/chapters/chapter_08_princess_minerva.json' with { type: 'json' };
import chapter08PrincessMinervaMap from '../../../data/maps/chapter_08_princess_minerva.json' with { type: 'json' };
import chapter09KnordaMarketChapter from '../../../data/chapters/chapter_09_knorda_market.json' with { type: 'json' };
import chapter09KnordaMarketMap from '../../../data/maps/chapter_09_knorda_market.json' with { type: 'json' };
import chapter10TheAgelessPalaceChapter from '../../../data/chapters/chapter_10_the_ageless_palace.json' with { type: 'json' };
import chapter10TheAgelessPalaceMap from '../../../data/maps/chapter_10_the_ageless_palace.json' with { type: 'json' };
import chapter11LandOfSorrowChapter from '../../../data/chapters/chapter_11_land_of_sorrow.json' with { type: 'json' };
import chapter11LandOfSorrowMap from '../../../data/maps/chapter_11_land_of_sorrow.json' with { type: 'json' };
import chapter12AnOasisOfMagicChapter from '../../../data/chapters/chapter_12_an_oasis_of_magic.json' with { type: 'json' };
import chapter12AnOasisOfMagicMap from '../../../data/maps/chapter_12_an_oasis_of_magic.json' with { type: 'json' };
import chapter13TheBattleForAlteaChapter from '../../../data/chapters/chapter_13_the_battle_for_altea.json' with { type: 'json' };
import chapter13TheBattleForAlteaMap from '../../../data/maps/chapter_13_the_battle_for_altea.json' with { type: 'json' };
import chapter14StarAndSaviorChapter from '../../../data/chapters/chapter_14_star_and_savior.json' with { type: 'json' };
import chapter14StarAndSaviorMap from '../../../data/maps/chapter_14_star_and_savior.json' with { type: 'json' };
import chapter15ManaketePrincessChapter from '../../../data/chapters/chapter_15_manakete_princess.json' with { type: 'json' };
import chapter15ManaketePrincessMap from '../../../data/maps/chapter_15_manakete_princess.json' with { type: 'json' };
import chapter16CamusTheSableChapter from '../../../data/chapters/chapter_16_camus_the_sable.json' with { type: 'json' };
import chapter16CamusTheSableMap from '../../../data/maps/chapter_16_camus_the_sable.json' with { type: 'json' };
import chapter17AKnightFilledSkyChapter from '../../../data/chapters/chapter_17_a_knight_filled_sky.json' with { type: 'json' };
import chapter17AKnightFilledSkyMap from '../../../data/maps/chapter_17_a_knight_filled_sky.json' with { type: 'json' };
import chapter18DarkPontifexChapter from '../../../data/chapters/chapter_18_dark_pontifex.json' with { type: 'json' };
import chapter18DarkPontifexMap from '../../../data/maps/chapter_18_dark_pontifex.json' with { type: 'json' };
import chapter19TheDragonkinRealmChapter from '../../../data/chapters/chapter_19_the_dragonkin_realm.json' with { type: 'json' };
import chapter19TheDragonkinRealmMap from '../../../data/maps/chapter_19_the_dragonkin_realm.json' with { type: 'json' };
import chapter20ChosenByFateChapter from '../../../data/chapters/chapter_20_chosen_by_fate.json' with { type: 'json' };
import chapter20ChosenByFateMap from '../../../data/maps/chapter_20_chosen_by_fate.json' with { type: 'json' };
import book2Chapter01TheGrustianExpeditionChapter from '../../../data/chapters/book2_chapter_01_the_grustian_expedition.json' with { type: 'json' };
import book2Chapter01TheGrustianExpeditionMap from '../../../data/maps/book2_chapter_01_the_grustian_expedition.json' with { type: 'json' };
import book2Chapter02MacedonianUprisingChapter from '../../../data/chapters/book2_chapter_02_macedonian_uprising.json' with { type: 'json' };
import book2Chapter02MacedonianUprisingMap from '../../../data/maps/book2_chapter_02_macedonian_uprising.json' with { type: 'json' };
import book2Chapter03AbductedPrincessChapter from '../../../data/chapters/book2_chapter_03_abducted_princess.json' with { type: 'json' };
import book2Chapter03AbductedPrincessMap from '../../../data/maps/book2_chapter_03_abducted_princess.json' with { type: 'json' };
import book2Chapter04JoyAndSorrowChapter from '../../../data/chapters/book2_chapter_04_joy_and_sorrow.json' with { type: 'json' };
import book2Chapter04JoyAndSorrowMap from '../../../data/maps/book2_chapter_04_joy_and_sorrow.json' with { type: 'json' };
import book2Chapter05LiberationOfGrustChapter from '../../../data/chapters/book2_chapter_05_liberation_of_grust.json' with { type: 'json' };
import book2Chapter05LiberationOfGrustMap from '../../../data/maps/book2_chapter_05_liberation_of_grust.json' with { type: 'json' };
import book2Chapter06TheNestOfEvilChapter from '../../../data/chapters/book2_chapter_06_the_nest_of_evil.json' with { type: 'json' };
import book2Chapter06TheNestOfEvilMap from '../../../data/maps/book2_chapter_06_the_nest_of_evil.json' with { type: 'json' };
import book2Chapter07TheScarletSwordChapter from '../../../data/chapters/book2_chapter_07_the_scarlet_sword.json' with { type: 'json' };
import book2Chapter07TheScarletSwordMap from '../../../data/maps/book2_chapter_07_the_scarlet_sword.json' with { type: 'json' };
import book2Chapter08SoulfulBridgeChapter from '../../../data/chapters/book2_chapter_08_soulful_bridge.json' with { type: 'json' };
import book2Chapter08SoulfulBridgeMap from '../../../data/maps/book2_chapter_08_soulful_bridge.json' with { type: 'json' };
import book2Chapter09SanctuaryOfSorceryChapter from '../../../data/chapters/book2_chapter_09_sanctuary_of_sorcery.json' with { type: 'json' };
import book2Chapter09SanctuaryOfSorceryMap from '../../../data/maps/book2_chapter_09_sanctuary_of_sorcery.json' with { type: 'json' };
import book2Chapter10TheTwoMagesChapter from '../../../data/chapters/book2_chapter_10_the_two_mages.json' with { type: 'json' };
import book2Chapter10TheTwoMagesMap from '../../../data/maps/book2_chapter_10_the_two_mages.json' with { type: 'json' };
import book2Chapter11AnrisWayChapter from '../../../data/chapters/book2_chapter_11_anris_way.json' with { type: 'json' };
import book2Chapter11AnrisWayMap from '../../../data/maps/book2_chapter_11_anris_way.json' with { type: 'json' };
import book2Chapter12GraveyardOfFireDragonsChapter from '../../../data/chapters/book2_chapter_12_graveyard_of_fire_dragons.json' with { type: 'json' };
import book2Chapter12GraveyardOfFireDragonsMap from '../../../data/maps/book2_chapter_12_graveyard_of_fire_dragons.json' with { type: 'json' };
import book2Chapter13FrozenLandChapter from '../../../data/chapters/book2_chapter_13_frozen_land.json' with { type: 'json' };
import book2Chapter13FrozenLandMap from '../../../data/maps/book2_chapter_13_frozen_land.json' with { type: 'json' };
import book2Chapter14AMysteryRevealedChapter from '../../../data/chapters/book2_chapter_14_a_mystery_revealed.json' with { type: 'json' };
import book2Chapter14AMysteryRevealedMap from '../../../data/maps/book2_chapter_14_a_mystery_revealed.json' with { type: 'json' };
import book2Chapter15ReturnOfThePrinceChapter from '../../../data/chapters/book2_chapter_15_return_of_the_prince.json' with { type: 'json' };
import book2Chapter15ReturnOfThePrinceMap from '../../../data/maps/book2_chapter_15_return_of_the_prince.json' with { type: 'json' };
import book2Chapter16RegainingTheCapitalChapter from '../../../data/chapters/book2_chapter_16_regaining_the_capital.json' with { type: 'json' };
import book2Chapter16RegainingTheCapitalMap from '../../../data/maps/book2_chapter_16_regaining_the_capital.json' with { type: 'json' };
import book2Chapter17GrasSunSetsChapter from '../../../data/chapters/book2_chapter_17_gras_sun_sets.json' with { type: 'json' };
import book2Chapter17GrasSunSetsMap from '../../../data/maps/book2_chapter_17_gras_sun_sets.json' with { type: 'json' };
import book2Chapter18BattleOfThePassChapter from '../../../data/chapters/book2_chapter_18_battle_of_the_pass.json' with { type: 'json' };
import book2Chapter18BattleOfThePassMap from '../../../data/maps/book2_chapter_18_battle_of_the_pass.json' with { type: 'json' };
import book2Chapter19TheLastDecisiveBattleChapter from '../../../data/chapters/book2_chapter_19_the_last_decisive_battle.json' with { type: 'json' };
import book2Chapter19TheLastDecisiveBattleMap from '../../../data/maps/book2_chapter_19_the_last_decisive_battle.json' with { type: 'json' };
import book2Chapter20TheDarkEmperorChapter from '../../../data/chapters/book2_chapter_20_the_dark_emperor.json' with { type: 'json' };
import book2Chapter20TheDarkEmperorMap from '../../../data/maps/book2_chapter_20_the_dark_emperor.json' with { type: 'json' };
import book2Chapter21TheWyvernsDaleChapter from '../../../data/chapters/book2_chapter_21_the_wyverns_dale.json' with { type: 'json' };
import book2Chapter21TheWyvernsDaleMap from '../../../data/maps/book2_chapter_21_the_wyverns_dale.json' with { type: 'json' };
import book2EndgameAChapter from '../../../data/chapters/book2_endgame_a.json' with { type: 'json' };
import book2EndgameAMap from '../../../data/maps/book2_endgame_a.json' with { type: 'json' };
import book2EndgameBChapter from '../../../data/chapters/book2_endgame_b.json' with { type: 'json' };
import book2EndgameBMap from '../../../data/maps/book2_endgame_b.json' with { type: 'json' };
import book2EndgameCChapter from '../../../data/chapters/book2_endgame_c.json' with { type: 'json' };
import book2EndgameCMap from '../../../data/maps/book2_endgame_c.json' with { type: 'json' };

export interface ChapterSource {
  /** Id ngắn trong file chương, ví dụ `chapter_05`, `book2_chapter_01`, `book2_endgame_a`. */
  readonly id: string;
  /** Nội dung thô của file chương; `loadChapterData` kiểm trước khi dùng. */
  readonly chapter: unknown;
  readonly map: MapData;
}

export const CHAPTER_SOURCES: readonly ChapterSource[] = [
  { id: 'chapter_01', chapter: chapter01TalysChapter, map: chapter01TalysMap as MapData },
  { id: 'chapter_02', chapter: chapter02GalderChapter, map: chapter02GalderMap as MapData },
  { id: 'chapter_03', chapter: chapter03DevilMountainChapter, map: chapter03DevilMountainMap as MapData },
  { id: 'chapter_04', chapter: chapter04ChampionsOfAurelisChapter, map: chapter04ChampionsOfAurelisMap as MapData },
  { id: 'chapter_05', chapter: chapter05FireEmblemChapter, map: chapter05FireEmblemMap as MapData },
  { id: 'chapter_06', chapter: chapter06LefcandithGauntletChapter, map: chapter06LefcandithGauntletMap as MapData },
  { id: 'chapter_07', chapter: chapter07PortWarrenChapter, map: chapter07PortWarrenMap as MapData },
  { id: 'chapter_08', chapter: chapter08PrincessMinervaChapter, map: chapter08PrincessMinervaMap as MapData },
  { id: 'chapter_09', chapter: chapter09KnordaMarketChapter, map: chapter09KnordaMarketMap as MapData },
  { id: 'chapter_10', chapter: chapter10TheAgelessPalaceChapter, map: chapter10TheAgelessPalaceMap as MapData },
  { id: 'chapter_11', chapter: chapter11LandOfSorrowChapter, map: chapter11LandOfSorrowMap as MapData },
  { id: 'chapter_12', chapter: chapter12AnOasisOfMagicChapter, map: chapter12AnOasisOfMagicMap as MapData },
  { id: 'chapter_13', chapter: chapter13TheBattleForAlteaChapter, map: chapter13TheBattleForAlteaMap as MapData },
  { id: 'chapter_14', chapter: chapter14StarAndSaviorChapter, map: chapter14StarAndSaviorMap as MapData },
  { id: 'chapter_15', chapter: chapter15ManaketePrincessChapter, map: chapter15ManaketePrincessMap as MapData },
  { id: 'chapter_16', chapter: chapter16CamusTheSableChapter, map: chapter16CamusTheSableMap as MapData },
  { id: 'chapter_17', chapter: chapter17AKnightFilledSkyChapter, map: chapter17AKnightFilledSkyMap as MapData },
  { id: 'chapter_18', chapter: chapter18DarkPontifexChapter, map: chapter18DarkPontifexMap as MapData },
  { id: 'chapter_19', chapter: chapter19TheDragonkinRealmChapter, map: chapter19TheDragonkinRealmMap as MapData },
  { id: 'chapter_20', chapter: chapter20ChosenByFateChapter, map: chapter20ChosenByFateMap as MapData },
  { id: 'book2_chapter_01', chapter: book2Chapter01TheGrustianExpeditionChapter, map: book2Chapter01TheGrustianExpeditionMap as MapData },
  { id: 'book2_chapter_02', chapter: book2Chapter02MacedonianUprisingChapter, map: book2Chapter02MacedonianUprisingMap as MapData },
  { id: 'book2_chapter_03', chapter: book2Chapter03AbductedPrincessChapter, map: book2Chapter03AbductedPrincessMap as MapData },
  { id: 'book2_chapter_04', chapter: book2Chapter04JoyAndSorrowChapter, map: book2Chapter04JoyAndSorrowMap as MapData },
  { id: 'book2_chapter_05', chapter: book2Chapter05LiberationOfGrustChapter, map: book2Chapter05LiberationOfGrustMap as MapData },
  { id: 'book2_chapter_06', chapter: book2Chapter06TheNestOfEvilChapter, map: book2Chapter06TheNestOfEvilMap as MapData },
  { id: 'book2_chapter_07', chapter: book2Chapter07TheScarletSwordChapter, map: book2Chapter07TheScarletSwordMap as MapData },
  { id: 'book2_chapter_08', chapter: book2Chapter08SoulfulBridgeChapter, map: book2Chapter08SoulfulBridgeMap as MapData },
  { id: 'book2_chapter_09', chapter: book2Chapter09SanctuaryOfSorceryChapter, map: book2Chapter09SanctuaryOfSorceryMap as MapData },
  { id: 'book2_chapter_10', chapter: book2Chapter10TheTwoMagesChapter, map: book2Chapter10TheTwoMagesMap as MapData },
  { id: 'book2_chapter_11', chapter: book2Chapter11AnrisWayChapter, map: book2Chapter11AnrisWayMap as MapData },
  { id: 'book2_chapter_12', chapter: book2Chapter12GraveyardOfFireDragonsChapter, map: book2Chapter12GraveyardOfFireDragonsMap as MapData },
  { id: 'book2_chapter_13', chapter: book2Chapter13FrozenLandChapter, map: book2Chapter13FrozenLandMap as MapData },
  { id: 'book2_chapter_14', chapter: book2Chapter14AMysteryRevealedChapter, map: book2Chapter14AMysteryRevealedMap as MapData },
  { id: 'book2_chapter_15', chapter: book2Chapter15ReturnOfThePrinceChapter, map: book2Chapter15ReturnOfThePrinceMap as MapData },
  { id: 'book2_chapter_16', chapter: book2Chapter16RegainingTheCapitalChapter, map: book2Chapter16RegainingTheCapitalMap as MapData },
  { id: 'book2_chapter_17', chapter: book2Chapter17GrasSunSetsChapter, map: book2Chapter17GrasSunSetsMap as MapData },
  { id: 'book2_chapter_18', chapter: book2Chapter18BattleOfThePassChapter, map: book2Chapter18BattleOfThePassMap as MapData },
  { id: 'book2_chapter_19', chapter: book2Chapter19TheLastDecisiveBattleChapter, map: book2Chapter19TheLastDecisiveBattleMap as MapData },
  { id: 'book2_chapter_20', chapter: book2Chapter20TheDarkEmperorChapter, map: book2Chapter20TheDarkEmperorMap as MapData },
  { id: 'book2_chapter_21', chapter: book2Chapter21TheWyvernsDaleChapter, map: book2Chapter21TheWyvernsDaleMap as MapData },
  { id: 'book2_endgame_a', chapter: book2EndgameAChapter, map: book2EndgameAMap as MapData },
  { id: 'book2_endgame_b', chapter: book2EndgameBChapter, map: book2EndgameBMap as MapData },
  { id: 'book2_endgame_c', chapter: book2EndgameCChapter, map: book2EndgameCMap as MapData },
];

/** Thứ tự chiến dịch: dùng để chọn chương kế tiếp sau khi thắng. */
export const CAMPAIGN_CHAPTER_IDS: readonly string[] = CHAPTER_SOURCES.map((source) => source.id);

/** Chương kế tiếp theo thứ tự chiến dịch, hoặc undefined khi đã là chương cuối. */
export function nextCampaignChapterId(chapterId: string): string | undefined {
  const index = CAMPAIGN_CHAPTER_IDS.indexOf(chapterId);
  if (index < 0) return undefined;
  return CAMPAIGN_CHAPTER_IDS[index + 1];
}
