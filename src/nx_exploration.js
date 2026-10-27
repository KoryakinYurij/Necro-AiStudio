/* ============ NECRO v2 · EXPLORATION WORLD & ORCHESTRATION ============
   Stage A + Stage B + Objective (A) + Field Necromancy & Command Banner (B):
   - Deterministic World & Multi-POI (Ruins / Altar / Crypt / Ossuary)
   - Spatial Danger Scaling (I - IV)
   - Expedition Objective: 3 Rift Seals -> Sanctuary Extraction Portal OR Citadel Boss Lair
   - Field Necromancy: Corpse Mounds ([R] Raise Skeletons / [Q] Siphon Soul & HP)
   - Tactical Legion Command: Stances ([E]) + World Focus Banner (Right-Click / [F]) */
(function () {
  'use strict';
  var N = window.__necro;
  if (!N || !N.exploration) return;
  var X = N.exploration;

  var AREA_SIZE = 1400;
  var SAFE_RADIUS = 420;
  var QUICK_DISCOVER_RADIUS = 700;
  var ACTIVATION_RADIUS = 180;
  var LEASH_RADIUS = 520;
  var DELAYED_SPAWN_MS = 180;
  var SPAWN_RETRY_MS = 100;
  var RUINS_CUE_RADIUS = 950;
  var SEALS_REQUIRED = 3;
  var MOUND_INTERACT_RADIUS = 260;
  var EXTRACTION_RADIUS = 240;

  var RUINS_REWARDS = [
    { id: 'reaping_edge', name: 'КРОМКА ЖАТВЫ', desc: '+25% к урону оружия', apply: function (g) { g.B.dmg += 25; } },
    { id: 'legion_teeth', name: 'ЗУБЫ ЛЕГИОНА', desc: '+25% к урону прислужников', apply: function (g) { g.B.mdmg += 25; } },
    { id: 'ossuary_heart', name: 'СЕРДЦЕ ОССУАРИЯ', desc: '+40 максимального здоровья', apply: function (g) { g.B.hp += 40; } }
  ];

  var POI_CATALOG = {
    ruins: {
      kicker: 'МЕСТО СИЛЫ ЗАЧИЩЕНО · ДРЕВНИЕ РУИНЫ (+1 ПЕЧАТЬ)',
      title: 'РУИНЫ ПОМНЯТ СИЛУ',
      sub: 'Бой остановлен. Выбери один дар для этой экспедиции.',
      accent: '#caa95b',
      rewards: RUINS_REWARDS
    },
    altar: {
      kicker: 'ПРОКЛЯТОЕ МЕСТО СИЛЫ · АЛТАРЬ КРОВИ (+1 ПЕЧАТЬ)',
      title: 'АЛТАРЬ ЖАЖДЕТ ЖЕРТВЫ',
      sub: 'Высшие стражи повержены. Прими один из багровых даров силы.',
      accent: '#ff4757',
      rewards: [
        {
          id: 'blood_harvest',
          name: 'КРОВАВАЯ ЖАТВА',
          desc: '+35% к урону оружия и мгновенное исцеление 30 ОЗ',
          apply: function (g) {
            g.B.dmg += 35;
            if (g.P) g.P.hp = Math.min(g.P.maxHp || 100, (g.P.hp || 100) + 30);
          }
        },
        {
          id: 'legion_frenzy',
          name: 'ЯРОСТЬ ЛЕГИОНА',
          desc: '+40% к урону прислужников и +15% к скорости движения',
          apply: function (g) {
            g.B.mdmg += 40;
            g.B.spd = (g.B.spd || 0) + 15;
          }
        },
        {
          id: 'obsidian_carapace',
          name: 'ОБСИДИАНОВЫЙ ПАНЦИРЬ',
          desc: '+55 максимального здоровья и +4 к броне некроманта',
          apply: function (g) {
            g.B.hp += 55;
            g.B.arm = (g.B.arm || 0) + 4;
          }
        }
      ]
    },
    crypt: {
      kicker: 'УСЫПАЛЬНИЦА ДРЕВНИХ · СКЛЕП ОТКРЫТ (+1 ПЕЧАТЬ)',
      title: 'СКЛЕП ДРЕВНИХ ВЛАДЫК',
      sub: 'Печать склепа сорвана. Забери реликвию усопших.',
      accent: '#8ef7c9',
      rewards: [
        {
          id: 'bone_reliquary',
          name: 'КОСТЯНОЙ РЕЛИКВАРИЙ',
          desc: '+30% к урону оружия и +20% к области поражения',
          apply: function (g) {
            g.B.dmg += 30;
            g.B.area = (g.B.area || 0) + 20;
          }
        },
        {
          id: 'tomb_wardens',
          name: 'СТРАЖИ УСЫПАЛЬНИЦЫ',
          desc: '+35% к урону прислужников и +35 максимального здоровья',
          apply: function (g) {
            g.B.mdmg += 35;
            g.B.hp += 35;
          }
        },
        {
          id: 'lich_heart',
          name: 'СЕРДЦЕ ЛИЧА',
          desc: '+65 максимального здоровья и полное исцеление',
          apply: function (g) {
            g.B.hp += 65;
            if (N.recalc) N.recalc();
            if (g.P) g.P.hp = g.P.maxHp;
          }
        }
      ]
    },
    ossuary: {
      kicker: 'ПОЛЕ БРАНИ · КУРГАН КОСТЕЙ (+1 ПЕЧАТЬ)',
      title: 'КУРГАН ПЕРВОРОДНОЙ КОСТИ',
      sub: 'Костяной строй сломлен. Направь прах на усиление экспедиции.',
      accent: '#b657ff',
      rewards: [
        {
          id: 'bone_shards',
          name: 'ОСКОЛКИ КОСТЕЙ',
          desc: '+25% к урону оружия и +20% к скорости сбора трофеев',
          apply: function (g) {
            g.B.dmg += 25;
            g.B.mag = (g.B.mag || 0) + 20;
          }
        },
        {
          id: 'phalanx_oath',
          name: 'КЛЯТВА ФАЛАНГИ',
          desc: '+35% к урону прислужников и возрождение павших слуг',
          apply: function (g) {
            g.B.mdmg += 35;
            if (g.minions) {
              g.minions.forEach(function (m) {
                if (m.dead) { m.dead = false; m.resp = 0; m.hp = m.maxhp || 80; }
              });
            }
          }
        },
        {
          id: 'barrow_blood',
          name: 'КУРГАННАЯ КРОВЬ',
          desc: '+50 максимального здоровья и исцеление 35 ОЗ',
          apply: function (g) {
            g.B.hp += 50;
            if (g.P) g.P.hp = Math.min((g.P.maxHp || 100) + 50, (g.P.hp || 100) + 35);
          }
        }
      ]
    }
  };

  var ALL_REWARDS = [];
  Object.keys(POI_CATALOG).forEach(function (k) {
    POI_CATALOG[k].rewards.forEach(function (r) { ALL_REWARDS.push(r); });
  });

  var ENCOUNTER_SLOTS = [
    { id: 'front-left', type: 'zom', dx: -36, dy: 18, delay: 0 },
    { id: 'front-right', type: 'zom', dx: 36, dy: 18, delay: 0 },
    { id: 'rear', type: 'zom', dx: 0, dy: -42, delay: DELAYED_SPAWN_MS }
  ];

  var currentRun = null;
  var currentGame = null;
  var forcedNextSeed = null;
  var encounterStates = new WeakMap();
  var poiStates = new WeakMap();
  var moundStates = new WeakMap();
  var anomalyStates = new WeakMap();
  var objectiveStates = new WeakMap();
  var rewardOpenQueued = null;
  var legionStance = 'hunt'; // 'hunt' | 'vanguard' | 'guard'
  var focusBanner = null;    // { x, y, left, maxT }
  var lastMoveDir = { x: 1, y: 0 };
  var grimoireCds = { bastion: 0, detonate: 0, dreadknight: 0, rift: 0 };
  var visualBursts = []; // { x, y, r, maxR, col, left, maxT }
  var ANOMALY_INTERACT_RADIUS = 115;

  /* ---------- FEATURE D1: SPATIAL SECTOR BIOMES & FIELD ANOMALIES ---------- */
  var SECTOR_BIOMES = [
    { idx: 0, id: 'sanctum', name: 'МОГИЛЬНОЕ СВЯТИЛИЩЕ', col: '#8ef7c9' },
    { idx: 1, id: 'rot_marshes', name: 'ГНИЛЫЕ ТОПИ', col: '#8dff57' },
    { idx: 2, id: 'bone_catacombs', name: 'КОСТЯНЫЕ КУРГАНЫ', col: '#b657ff' },
    { idx: 3, id: 'ash_wastes', name: 'ПЕПЕЛЬНЫЕ ПУСТОШИ', col: '#ff6b7f' }
  ];

  var ANOMALY_CATALOG = {
    obelisk: {
      kind: 'obelisk',
      title: 'ДРЕВНИЙ ОБЕЛИСК ЗНАНИЙ',
      short: '+60 ОПЫТА, +40 ✦ ЭССЕНЦИИ И +15% К ОПЫТУ',
      col: '#70d6ff'
    },
    cursed_shrine: {
      kind: 'cursed_shrine',
      title: 'ПРОКЛЯТЫЙ АЛТАРЬ ИСПЫТАНИЯ',
      short: 'БОЙ С ЧЕМПИОНОМ → +2 ❖ ПЕЧАТИ И +25% УРОНА',
      col: '#ff4757'
    },
    soul_well: {
      kind: 'soul_well',
      title: 'КОЛОДЕЦ ЗАБЫТЫХ ДУШ',
      short: '+60 ОЗ, +30 МАКС. ОЗ И ДУХ-ПРОВОДНИК В СТРОЙ',
      col: '#8ef7c9'
    }
  };

  /* ---------- FEATURE D2: EXPEDITION LEVEL-UP PERKS DECK ---------- */
  var EXPEDITION_PERKS = [
    {
      id: 'banner_lord',
      name: 'ЗНАМЕНОСЕЦ ПОХОДА',
      badge: 'ТАКТИКА ЭКСПЕДИЦИИ',
      col: '#ffd23f',
      desc: 'Знамя Охоты [F/ПКМ] стоит на +4с дольше, усиливает урон армии на +25% и сразу даёт +30 ✦',
      apply: function (g) {
        g.explorationPerks = g.explorationPerks || {};
        g.explorationPerks.banner_lord = (g.explorationPerks.banner_lord || 0) + 1;
        g.B.mdmg = (g.B.mdmg || 0) + 25;
        gainExplorationEssence(30);
      }
    },
    {
      id: 'corpse_alchemist',
      name: 'АЛХИМИЯ КУРГАНОВ',
      badge: 'ПОЛЕВАЯ НЕКРОМАНТИЯ',
      col: '#8ef7c9',
      desc: 'Курганы Праха [R/Q] дают дополнительно +30 ✦ Эссенции и поднимают скелета-лучника в строй',
      apply: function (g) {
        g.explorationPerks = g.explorationPerks || {};
        g.explorationPerks.corpse_alchemist = (g.explorationPerks.corpse_alchemist || 0) + 1;
        g.B.mdmg = (g.B.mdmg || 0) + 15;
        if (g.minions && g.P) {
          g.minions.push({
            kind: 'archers', x: g.P.x - 22, y: g.P.y + 14, vx: 0, vy: 0,
            hp: 85, maxhp: 85, dmg: 22, spd: 150, r: 10, cd: 0, resp: 0, dead: false, ang: 0, ph: 0
          });
        }
      }
    },
    {
      id: 'grimoire_mastery',
      name: 'КОДЕКС ПОЛЕВЫХ РИТУАЛОВ',
      badge: 'ГРИМУАР ПОХОДА',
      col: '#b657ff',
      desc: '-18% перезарядки полевых ритуалов [1–4], +25 к макс. Эссенции ✦ и мгновенный сброс откатов',
      apply: function (g) {
        g.explorationPerks = g.explorationPerks || {};
        g.explorationPerks.grimoire_mastery = (g.explorationPerks.grimoire_mastery || 0) + 1;
        g.B.cdr = (g.B.cdr || 0) + 18;
        g.explorationMaxEssence = (g.explorationMaxEssence || 100) + 25;
        gainExplorationEssence(40);
        grimoireCds = { bastion: 0, detonate: 0, dreadknight: 0, rift: 0 };
      }
    },
    {
      id: 'vanguard_command',
      name: 'ПАНЦИРЬ КОМАНДИРА',
      badge: 'СТРОЙ ЛЕГИОНА',
      col: '#e8dcc0',
      desc: '+2 к броне, +35 макс. ОЗ некроманта и +20% к урону прислужников в строю',
      apply: function (g) {
        g.explorationPerks = g.explorationPerks || {};
        g.explorationPerks.vanguard_command = (g.explorationPerks.vanguard_command || 0) + 1;
        g.B.armor = (g.B.armor || 0) + 2;
        g.B.hp = (g.B.hp || 0) + 35;
        g.B.mdmg = (g.B.mdmg || 0) + 20;
      }
    },
    {
      id: 'stalker_stride',
      name: 'ПОСТУПЬ ПЕРВОПРОХОДЦА',
      badge: 'РАЗВЕДКА МИРА',
      col: '#70a1ff',
      desc: '+10% к скорости бега в экспедиции, +40% к радиусу сбора и +25% к опыту',
      apply: function (g) {
        g.explorationPerks = g.explorationPerks || {};
        g.explorationPerks.stalker_stride = (g.explorationPerks.stalker_stride || 0) + 1;
        g.B.spd = (g.B.spd || 0) + 10;
        g.B.mag = (g.B.mag || 0) + 40;
        g.B.xp = (g.B.xp || 0) + 25;
      }
    },
    {
      id: 'dread_retinue',
      name: 'СВИТА ДРЕВНЕГО СКЛЕПА',
      badge: 'ПРИЗЫВ ЭКСПЕДИЦИИ',
      col: '#ff6b7f',
      desc: 'Немедленно призывает Призрачного Огонька и Костяного Жреца в твой отряд (+20% урона)',
      apply: function (g) {
        g.explorationPerks = g.explorationPerks || {};
        g.explorationPerks.dread_retinue = (g.explorationPerks.dread_retinue || 0) + 1;
        g.B.dmg = (g.B.dmg || 0) + 20;
        if (g.minions && g.P) {
          g.minions.push({
            kind: 'ghost_wisp', x: g.P.x + 26, y: g.P.y - 16, vx: 0, vy: 0,
            hp: 95, maxhp: 95, dmg: 26, spd: 185, r: 10, cd: 0, resp: 0, dead: false, ang: 0, ph: 0
          });
          g.minions.push({
            kind: 'bone_priest', x: g.P.x - 26, y: g.P.y - 16, vx: 0, vy: 0,
            hp: 110, maxhp: 110, dmg: 18, spd: 115, r: 11, cd: 0, resp: 0, dead: false, ang: 0, ph: 0
          });
        }
      }
    }
  ];

  /* ---------- FEATURE C1: EXPEDITION SANCTUARY META-PROGRESSION ---------- */
  var EXP_META_KEY = 'necro_expedition_meta_v1';
  var SANCTUARY_UPGRADES = [
    {
      id: 'vanguard_forge',
      name: 'КУЗНЯ АВАНГАРДА',
      desc: '+15% к урону прислужников в экспедиции за ранг',
      max: 5,
      baseCost: 2,
      stepCost: 2
    },
    {
      id: 'essence_vessel',
      name: 'СОСУД ЭССЕНЦИИ',
      desc: '+15 к макс./старт. Эссенции Похода ✦ и +20% к её притоку за ранг',
      max: 5,
      baseCost: 2,
      stepCost: 2
    },
    {
      id: 'ward_seal',
      name: 'ПЕЧАТЬ СТОЙКОСТИ',
      desc: '+25 к макс. ОЗ некроманта и +12 ОЗ от Курганов Праха за ранг',
      max: 5,
      baseCost: 2,
      stepCost: 2
    },
    {
      id: 'marshal_banner',
      name: 'ЗНАМЯ ПОЛКОВОДЦА',
      desc: '+15% к урону оружия/ритуалов и +2.5с к длительности Знамени Охоты за ранг',
      max: 5,
      baseCost: 3,
      stepCost: 2
    },
    {
      id: 'pathfinder_step',
      name: 'ТРОПА ИСКАТЕЛЯ',
      desc: '+6% к скорости шага в мире и +25% к радиусу сбора трофеев за ранг',
      max: 5,
      baseCost: 2,
      stepCost: 2
    }
  ];

  var SANCTUARY_RELICS = [
    {
      id: 'ash_crown',
      name: 'КОРОНА ПЕПЛА',
      desc: 'Начинаешь экспедицию сразу с тяжёлым Костяным Рыцарем в свите'
    },
    {
      id: 'soul_lantern',
      name: 'ФОНАРЬ ДУШ',
      desc: 'Полевые ритуалы [1–4] требуют на 20% меньше Эссенции ✦, а Курганы дают +25 ✦'
    },
    {
      id: 'blood_compass',
      name: 'КРОВАВЫЙ КОМПАС',
      desc: 'Захват каждого Места Силы дополнительно исцеляет 35 ОЗ и даёт +12% к урону'
    }
  ];

  var expMeta = {
    sigils: 0,
    runsCompleted: 0,
    bossesSlain: 0,
    totalSeals: 0,
    activeRelic: null,
    upgrades: {
      vanguard_forge: 0,
      essence_vessel: 0,
      ward_seal: 0,
      marshal_banner: 0,
      pathfinder_step: 0
    }
  };

  function loadExpMeta() {
    try {
      var raw = localStorage.getItem(EXP_META_KEY);
      if (!raw) return;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      if (Number.isFinite(parsed.sigils)) expMeta.sigils = Math.max(0, parsed.sigils | 0);
      if (Number.isFinite(parsed.runsCompleted)) expMeta.runsCompleted = Math.max(0, parsed.runsCompleted | 0);
      if (Number.isFinite(parsed.bossesSlain)) expMeta.bossesSlain = Math.max(0, parsed.bossesSlain | 0);
      if (Number.isFinite(parsed.totalSeals)) expMeta.totalSeals = Math.max(0, parsed.totalSeals | 0);
      if (typeof parsed.activeRelic === 'string' || parsed.activeRelic === null) expMeta.activeRelic = parsed.activeRelic;
      if (parsed.upgrades && typeof parsed.upgrades === 'object') {
        SANCTUARY_UPGRADES.forEach(function (u) {
          var v = parsed.upgrades[u.id];
          if (Number.isFinite(v)) expMeta.upgrades[u.id] = Math.max(0, Math.min(u.max, v | 0));
        });
      }
    } catch (e) {}
  }

  function saveExpMeta() {
    try {
      localStorage.setItem(EXP_META_KEY, JSON.stringify(expMeta));
    } catch (e) {}
    syncSanctuaryButtons();
  }

  loadExpMeta();

  function upgradeCost(id) {
    for (var i = 0; i < SANCTUARY_UPGRADES.length; i++) {
      var u = SANCTUARY_UPGRADES[i];
      if (u.id === id) {
        var lvl = expMeta.upgrades[id] || 0;
        if (lvl >= u.max) return Infinity;
        return u.baseCost + lvl * u.stepCost;
      }
    }
    return Infinity;
  }

  function buySanctuaryUpgrade(id) {
    var cost = upgradeCost(id);
    if (!Number.isFinite(cost) || expMeta.sigils < cost) return false;
    expMeta.sigils -= cost;
    expMeta.upgrades[id] = (expMeta.upgrades[id] || 0) + 1;
    saveExpMeta();
    renderSanctuaryModal();
    return true;
  }

  function selectSanctuaryRelic(id) {
    if (id !== null && !SANCTUARY_RELICS.some(function (r) { return r.id === id; })) return false;
    expMeta.activeRelic = expMeta.activeRelic === id ? null : id;
    saveExpMeta();
    renderSanctuaryModal();
    return true;
  }

  function awardSigils(amount, reason) {
    var n = Math.max(0, amount | 0);
    if (!n) return 0;
    expMeta.sigils += n;
    if (N.G) {
      N.G.explorationSigilsEarned = (N.G.explorationSigilsEarned || 0) + n;
    }
    saveExpMeta();
    if (reason) notify('+' + n + ' ❖ ПЕЧАТЬ ИСХОДА (' + reason + ')', '#ffd23f');
    return expMeta.sigils;
  }

  function hasAnySanctuaryProgression() {
    if (expMeta.activeRelic) return true;
    for (var k in expMeta.upgrades) {
      if ((expMeta.upgrades[k] || 0) > 0) return true;
    }
    return false;
  }

  function applySanctuaryToRun(game) {
    if (!game || !game.B) return;
    var u = expMeta.upgrades;
    var maxEss = 100 + (u.essence_vessel || 0) * 15;
    var startEss = 45 + (u.essence_vessel || 0) * 15;
    game.explorationMaxEssence = maxEss;
    game.explorationEssence = Math.min(maxEss, startEss);
    game.explorationSigilsEarned = 0;
    grimoireCds = { bastion: 0, detonate: 0, dreadknight: 0, rift: 0 };
    visualBursts = [];

    if (!hasAnySanctuaryProgression()) return;

    if (u.vanguard_forge > 0) game.B.mdmg = (game.B.mdmg || 0) + u.vanguard_forge * 15;
    if (u.ward_seal > 0) game.B.hp = (game.B.hp || 0) + u.ward_seal * 25;
    if (u.marshal_banner > 0) game.B.dmg = (game.B.dmg || 0) + u.marshal_banner * 15;
    if (u.pathfinder_step > 0) {
      game.B.spd = (game.B.spd || 0) + u.pathfinder_step * 6;
      game.B.mag = (game.B.mag || 0) + u.pathfinder_step * 25;
    }
    if (N.recalc) N.recalc();
    if (u.ward_seal > 0 && game.P) {
      game.P.hp = game.P.maxHp;
    }
    if (expMeta.activeRelic === 'ash_crown' && game.minions && game.P) {
      game.minions.push({
        kind: 'bone_knight',
        x: game.P.x + 28,
        y: game.P.y + 12,
        vx: 0, vy: 0,
        hp: 220, maxhp: 220, dmg: 38, spd: 140,
        r: 14, cd: 0, resp: 0, dead: false, ang: 0, ph: 0
      });
    }
  }

  /* ---------- FEATURE C2: FIELD GRIMOIRE (ACTIVE SKILLS 1-4) ---------- */
  var FIELD_SKILLS = [
    {
      id: 'bastion',
      key: '1',
      name: 'КОСТЯНОЙ БАСТИОН',
      short: 'Щит + Возрождение',
      cost: 25,
      cd: 8
    },
    {
      id: 'detonate',
      key: '2',
      name: 'ВЗРЫВ ПРАХА',
      short: 'Нова у Знамени/Героя',
      cost: 30,
      cd: 6
    },
    {
      id: 'dreadknight',
      key: '3',
      name: 'СТРАЖ СКЛЕПА',
      short: 'Призыв Рыцаря Кости',
      cost: 40,
      cd: 14
    },
    {
      id: 'rift',
      key: '4',
      name: 'ФАЗОВЫЙ СДВИГ',
      short: 'Скачок со Свитой',
      cost: 30,
      cd: 9
    }
  ];

  function effectiveSkillCost(skill) {
    var mult = expMeta.activeRelic === 'soul_lantern' ? 0.8 : 1;
    return Math.max(5, Math.round(skill.cost * mult));
  }

  function gainExplorationEssence(amount) {
    if (!N.G) return 0;
    var maxE = N.G.explorationMaxEssence || 100;
    N.G.explorationEssence = Math.min(maxE, (N.G.explorationEssence || 0) + amount);
    return N.G.explorationEssence;
  }

  function castFieldSkill(skillId) {
    var run = ensureRun();
    if (!run || !N.G || !N.G.P || N.state !== 'play' || X.mode !== 'exploration') return false;
    var skill = null;
    for (var i = 0; i < FIELD_SKILLS.length; i++) {
      if (FIELD_SKILLS[i].id === skillId) { skill = FIELD_SKILLS[i]; break; }
    }
    if (!skill) return false;
    if ((grimoireCds[skill.id] || 0) > 0) {
      notify(skill.name + ': ПЕРЕЗАРЯДКА (' + Math.ceil(grimoireCds[skill.id]) + 'С)', '#a89bb9');
      return false;
    }
    var cost = effectiveSkillCost(skill);
    var curEss = N.G.explorationEssence != null ? N.G.explorationEssence : 45;
    if (curEss < cost) {
      notify('НУЖНО ' + cost + ' ✦ ЭССЕНЦИИ ПОХОДА', '#ff6b7f');
      return false;
    }
    N.G.explorationEssence = curEss - cost;
    var cdrMult = Math.max(0.45, 1 - ((N.G.B && N.G.B.cdr) || 0) / 100);
    grimoireCds[skill.id] = Number((skill.cd * cdrMult).toFixed(2));
    var G = N.G;
    var P = G.P;

    if (skill.id === 'bastion') {
      P.inv = Math.max(P.inv || 0, 1.6);
      P.hp = Math.min(P.maxHp || 100, (P.hp || 100) + 20);
      var revived = 0;
      if (G.minions) {
        G.minions.forEach(function (m) {
          if (m.dead && revived < 2) {
            m.dead = false;
            m.resp = 0;
            m.hp = m.maxhp || 100;
            m.x = P.x + (revived === 0 ? -24 : 24);
            m.y = P.y + 12;
            revived++;
          } else if (!m.dead) {
            m.hp = m.maxhp || m.hp;
          }
          if (!m.dead) {
            visualBursts.push({ kind: 'minion_ward', x: m.x, y: m.y, maxR: 26, col: '#8ef7c9', left: 0.45, maxT: 0.45 });
          }
        });
        if (revived === 0) {
          G.minions.push({
            kind: 'warriors',
            x: P.x + 24, y: P.y, vx: 0, vy: 0,
            hp: 115, maxhp: 115, dmg: 26, spd: 145,
            r: 11, cd: 0, resp: 0, dead: false, ang: 0, ph: 0
          });
          visualBursts.push({ kind: 'minion_ward', x: P.x + 24, y: P.y, maxR: 28, col: '#8ef7c9', left: 0.45, maxT: 0.45 });
        }
      }
      G.shake = Math.max(G.shake || 0, 5);
      visualBursts.push({ kind: 'bastion', x: P.x, y: P.y, maxR: 138, col: '#8ef7c9', left: 0.65, maxT: 0.65 });
      notify('КОСТЯНОЙ БАСТИОН: СВИТА ИСЦЕЛЕНА И УКРЫТА ЩИТОМ', '#8ef7c9');
    } else if (skill.id === 'detonate') {
      var cx = focusBanner ? focusBanner.x : P.x;
      var cy = focusBanner ? focusBanner.y : P.y;
      var rad = 195;
      var dmgMult = 1 + ((G.B && G.B.dmg) || 0) / 100;
      var dmg = Math.round((95 + (G.level || 1) * 20) * dmgMult);
      var hits = 0;
      (G.enemies || []).forEach(function (e) {
        if (e.dead) return;
        var d = Math.hypot(e.x - cx, e.y - cy);
        if (d <= rad + (e.r || 12)) {
          e.hp -= dmg;
          e.hitT = 0.25;
          e.slowT = Math.max(e.slowT || 0, 3.5);
          if (e.hp <= 0) e.dead = true;
          hits++;
          if (hits <= 8) {
            visualBursts.push({ kind: 'ash_hit', x: e.x, y: e.y, maxR: 34, col: '#ff5e6c', left: 0.42, maxT: 0.42 });
          }
        }
      });
      G.shake = Math.max(G.shake || 0, 12);
      visualBursts.push({ kind: 'detonate', x: cx, y: cy, maxR: rad, col: '#ff5e6c', left: 0.72, maxT: 0.72 });
      notify('ВЗРЫВ ПРАХА: ПОРАЖЕНО ЦЕЛЕЙ — ' + hits, '#ff6b7f');
    } else if (skill.id === 'dreadknight') {
      var kx = focusBanner ? focusBanner.x : (P.x + lastMoveDir.x * 48);
      var ky = focusBanner ? focusBanner.y : (P.y + lastMoveDir.y * 48);
      var mdmgMult = 1 + ((G.B && G.B.mdmg) || 0) / 100;
      G.minions = G.minions || [];
      G.minions.push({
        kind: 'bone_knight',
        x: kx, y: ky, vx: 0, vy: 0,
        hp: Math.round(240 * mdmgMult),
        maxhp: Math.round(240 * mdmgMult),
        dmg: Math.round(42 * mdmgMult),
        spd: 148,
        r: 14, cd: 0, resp: 0, dead: false, ang: 0, ph: 0
      });
      G.shake = Math.max(G.shake || 0, 8);
      visualBursts.push({ kind: 'dreadknight', x: kx, y: ky, maxR: 118, col: '#b657ff', left: 0.75, maxT: 0.75 });
      notify('СТРАЖ СКЛЕПА ПРИЗВАН В БОЙ!', '#b657ff');
    } else if (skill.id === 'rift') {
      var ox = P.x, oy = P.y;
      var tx = focusBanner ? focusBanner.x : (P.x + lastMoveDir.x * 190);
      var ty = focusBanner ? focusBanner.y : (P.y + lastMoveDir.y * 190);
      visualBursts.push({ kind: 'rift_out', x: ox, y: oy, tx: tx, ty: ty, maxR: 92, col: '#caa95b', left: 0.52, maxT: 0.52 });
      P.x = tx;
      P.y = ty;
      P._lastX = tx;
      P._lastY = ty;
      P.inv = Math.max(P.inv || 0, 1.0);
      P.dashCd = 0;
      if (G.minions) {
        G.minions.forEach(function (m, idx) {
          if (m.dead) return;
          var ang = (idx / Math.max(1, G.minions.length)) * Math.PI * 2;
          m.x = tx + Math.cos(ang) * 34;
          m.y = ty + Math.sin(ang) * 34;
        });
      }
      (G.enemies || []).forEach(function (e) {
        if (e.dead) return;
        if (Math.hypot(e.x - tx, e.y - ty) <= 115) {
          e.hp -= 48;
          e.hitT = 0.2;
          if (e.hp <= 0) e.dead = true;
        }
      });
      G.shake = Math.max(G.shake || 0, 7);
      visualBursts.push({ kind: 'rift_in', x: tx, y: ty, ox: ox, oy: oy, maxR: 125, col: '#ffd23f', left: 0.62, maxT: 0.62 });
      notify('ФАЗОВЫЙ СДВИГ: ЛЕГИОН ПЕРЕМЕЩЁН', '#ffd23f');
    }

    try {
      var slotBtn = document.querySelector('#nxExpGrimoireHud [data-skill="' + skill.id + '"]');
      if (slotBtn) {
        slotBtn.classList.remove('cast-flash');
        void slotBtn.offsetWidth;
        slotBtn.classList.add('cast-flash');
        setTimeout(function () { slotBtn.classList.remove('cast-flash'); }, 360);
      }
    } catch (e) {}

    updateExpHudDom();
    updateGrimoireHudDom();
    return true;
  }

  function notify(txt, col) {
    try {
      var t = document.createElement('div');
      t.className = 'nx-toast';
      t.style.color = col || '#ffd23f';
      t.textContent = txt;
      document.body.appendChild(t);
      setTimeout(function () { t.classList.add('out'); }, 1500);
      setTimeout(function () { t.remove(); }, 2100);
    } catch (e) {}
  }

  function mix32(x) {
    x = (x ^ (x >>> 16)) >>> 0;
    x = Math.imul(x, 0x7feb352d) >>> 0;
    x = (x ^ (x >>> 15)) >>> 0;
    x = Math.imul(x, 0x846ca68b) >>> 0;
    return (x ^ (x >>> 16)) >>> 0;
  }

  function areaSeed(seed, ax, ay) {
    var h = seed >>> 0;
    h ^= Math.imul(ax | 0, 0x9e3779b1);
    h ^= Math.imul(ay | 0, 0x85ebca77);
    return mix32(h >>> 0);
  }

  function localRng(seed) {
    var s = seed >>> 0;
    return function () {
      s = (s + 0x6d2b79f5) >>> 0;
      var t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function getAreaMeta(seed, ax, ay) {
    if (ax === 0 && ay === 0) {
      return {
        poiSubType: 'ruins',
        title: 'ДРЕВНИЕ РУИНЫ',
        biomeIdx: 0,
        biomeId: 'sanctum',
        biomeName: 'МОГИЛЬНОЕ СВЯТИЛИЩЕ',
        biomeCol: '#8ef7c9',
        danger: 1,
        dangerRoman: 'I',
        hpScale: 1,
        dmgScale: 1,
        slots: ENCOUNTER_SLOTS,
        anomaly: null
      };
    }
    var dist = Math.abs(ax | 0) + Math.abs(ay | 0);
    var metaRng = localRng(areaSeed((seed ^ 0x5bd1e995) >>> 0, ax, ay));
    var roll = metaRng();
    var poiSubType = 'camp';
    var title = 'СТОРОЖЕВОЙ ПОСТ';
    if (dist === 1) {
      if (roll < 0.36) { poiSubType = 'altar'; title = 'АЛТАРЬ КРОВИ'; }
      else if (roll < 0.68) { poiSubType = 'crypt'; title = 'СКЛЕП ДРЕВНИХ'; }
      else if (roll < 0.92) { poiSubType = 'ossuary'; title = 'КУРГАН КОСТЕЙ'; }
    } else {
      if (roll < 0.42) { poiSubType = 'altar'; title = 'АЛТАРЬ КРОВИ'; }
      else if (roll < 0.76) { poiSubType = 'crypt'; title = 'СКЛЕП ДРЕВНИХ'; }
      else if (roll < 0.94) { poiSubType = 'ossuary'; title = 'КУРГАН КОСТЕЙ'; }
    }

    var biomeHash = Math.abs(Math.imul(ax | 0, 7) ^ Math.imul(ay | 0, 13) ^ ((seed >>> 3) & 0xff));
    var biomeIdx = 1 + (biomeHash % 3); // 1: rot_marshes, 2: bone_catacombs, 3: ash_wastes
    var biomeObj = SECTOR_BIOMES[biomeIdx] || SECTOR_BIOMES[1];

    var baseDanger = dist <= 1 ? 1 : dist === 2 ? 2 : 3;
    if (poiSubType === 'altar' && baseDanger < 3) baseDanger += 1;
    else if (poiSubType === 'crypt' && dist >= 2 && baseDanger < 3) baseDanger += 1;

    var hpScale = baseDanger === 1 ? 1.15 : baseDanger === 2 ? 1.45 : 1.85 + Math.min(1.2, (dist - 3) * 0.2);
    var dmgScale = baseDanger === 1 ? 1.1 : baseDanger === 2 ? 1.3 : 1.55 + Math.min(0.8, (dist - 3) * 0.12);
    var dangerRoman = baseDanger === 1 ? 'I' : baseDanger === 2 ? 'II' : 'III';

    var slots;
    if (poiSubType === 'altar') {
      slots = [
        { id: 'front-left', type: 'skel', dx: -44, dy: 22, delay: 0 },
        { id: 'front-right', type: 'cultist', dx: 44, dy: 22, delay: 0 },
        { id: 'rear', type: baseDanger >= 2 ? 'elite' : 'skel', dx: 0, dy: -46, delay: DELAYED_SPAWN_MS }
      ];
    } else if (poiSubType === 'crypt') {
      slots = [
        { id: 'front-left', type: 'skel', dx: -40, dy: 20, delay: 0 },
        { id: 'front-right', type: 'spitter', dx: 40, dy: 20, delay: 0 },
        { id: 'rear', type: 'cultist', dx: 0, dy: -44, delay: DELAYED_SPAWN_MS }
      ];
    } else if (poiSubType === 'ossuary') {
      slots = [
        { id: 'front-left', type: 'skel', dx: -38, dy: 18, delay: 0 },
        { id: 'front-right', type: 'bone_archer', dx: 38, dy: 18, delay: 0 },
        { id: 'rear', type: 'bat', dx: 0, dy: -42, delay: DELAYED_SPAWN_MS }
      ];
    } else {
      slots = [
        { id: 'front-left', type: 'zom', dx: -36, dy: 18, delay: 0 },
        { id: 'front-right', type: dist >= 2 ? 'skel' : 'zom', dx: 36, dy: 18, delay: 0 },
        { id: 'rear', type: dist >= 2 ? 'bat' : 'zom', dx: 0, dy: -42, delay: DELAYED_SPAWN_MS }
      ];
    }

    var anomRoll = metaRng();
    var anomKind = anomRoll < 0.36 ? 'obelisk' : anomRoll < 0.68 ? 'soul_well' : 'cursed_shrine';
    var anomCfg = ANOMALY_CATALOG[anomKind];
    var anomAng = metaRng() * Math.PI * 2;
    var anomX = Math.round(ax * AREA_SIZE + Math.cos(anomAng) * 235);
    var anomY = Math.round(ay * AREA_SIZE + Math.sin(anomAng) * 235);

    return {
      poiSubType: poiSubType,
      title: title,
      biomeIdx: biomeObj.idx,
      biomeId: biomeObj.id,
      biomeName: biomeObj.name,
      biomeCol: biomeObj.col,
      danger: baseDanger,
      dangerRoman: dangerRoman,
      hpScale: Number(hpScale.toFixed(2)),
      dmgScale: Number(dmgScale.toFixed(2)),
      slots: slots,
      anomaly: {
        id: 'anomaly:' + ax + ':' + ay,
        kind: anomCfg.kind,
        title: anomCfg.title,
        short: anomCfg.short,
        col: anomCfg.col,
        area: { x: ax, y: ay },
        x: anomX,
        y: anomY
      }
    };
  }

  function describeArea(seed, ax, ay) {
    var rng = localRng(areaSeed(seed, ax, ay));
    var x, y;
    if (ax === 0 && ay === 0) {
      var angle = rng() * Math.PI * 2;
      var radius = SAFE_RADIUS + 100 + rng() * 120;
      x = Math.round(Math.cos(angle) * radius);
      y = Math.round(Math.sin(angle) * radius);
    } else {
      x = Math.round(ax * AREA_SIZE + (rng() - .5) * AREA_SIZE * .45);
      y = Math.round(ay * AREA_SIZE + (rng() - .5) * AREA_SIZE * .45);
    }
    var isStart = ax === 0 && ay === 0;
    return [{
      id: 'opportunity:' + ax + ':' + ay,
      kind: isStart ? 'ruins' : 'opportunity',
      poiType: isStart ? 'ruins' : null,
      name: isStart ? 'РУИНЫ' : null,
      hostile: true, state: 'generated',
      area: { x: ax, y: ay }, x: x, y: y
    }];
  }

  function createWorld(seed) {
    seed = seed >>> 0;
    var areas = new Map();
    function visitArea(ax, ay) {
      var key = ax + ',' + ay;
      if (!areas.has(key)) areas.set(key, describeArea(seed, ax, ay));
      return areas.get(key).map(copyDescriptor);
    }
    function snapshot() {
      var all = [];
      areas.forEach(function (list) { list.forEach(function (d) { all.push(copyDescriptor(d)); }); });
      all.sort(function (a, b) { return a.id.localeCompare(b.id); });
      return all;
    }
    var run = { seed: seed, visitArea: visitArea, snapshot: snapshot };
    encounterStates.set(run, new Map());
    poiStates.set(run, new Map());
    moundStates.set(run, new Map());
    anomalyStates.set(run, new Map());
    var citAngle = ((seed % 360) * Math.PI) / 180;
    var citDist = AREA_SIZE * 1.65;
    objectiveStates.set(run, {
      seals: 0,
      requiredSeals: SEALS_REQUIRED,
      unlocked: false,
      extracted: false,
      citadel: {
        x: Math.round(Math.cos(citAngle) * citDist),
        y: Math.round(Math.sin(citAngle) * citDist),
        status: 'locked', // 'locked' | 'available' | 'active' | 'cleared'
        boss: null
      }
    });
    return run;
  }

  function copyDescriptor(d) {
    return {
      id: d.id, kind: d.kind, poiType: d.poiType || null, name: d.name || null, hostile: d.hostile, state: d.state,
      area: { x: d.area.x, y: d.area.y }, x: d.x, y: d.y
    };
  }

  function stateMap(run) {
    var map = encounterStates.get(run);
    if (!map) { map = new Map(); encounterStates.set(run, map); }
    return map;
  }

  function moundMap(run) {
    var map = moundStates.get(run);
    if (!map) { map = new Map(); moundStates.set(run, map); }
    return map;
  }

  function anomalyMap(run) {
    var map = anomalyStates.get(run);
    if (!map) { map = new Map(); anomalyStates.set(run, map); }
    return map;
  }

  function ensureSectorAnomaly(run, ax, ay) {
    if (!run || (ax === 0 && ay === 0)) return null;
    var meta = getAreaMeta(run.seed, ax, ay);
    if (!meta || !meta.anomaly) return null;
    var map = anomalyMap(run);
    if (!map.has(meta.anomaly.id)) {
      map.set(meta.anomaly.id, Object.assign({}, meta.anomaly, { status: 'available' }));
    }
    return map.get(meta.anomaly.id);
  }

  function nearestAvailableAnomaly(run) {
    if (!run || !N.G || !N.G.P) return null;
    var P = N.G.P;
    var best = null;
    var bestDist = Infinity;
    anomalyMap(run).forEach(function (a) {
      if (a.status !== 'available') return;
      var d = Math.hypot(a.x - P.x, a.y - P.y);
      if (d <= ANOMALY_INTERACT_RADIUS && d < bestDist) {
        best = a;
        bestDist = d;
      }
    });
    return best;
  }

  function activateNearestAnomaly() {
    var run = ensureRun();
    if (!run || !N.G || !N.G.P || N.state !== 'play') return false;
    var anom = nearestAvailableAnomaly(run);
    if (!anom) return false;
    anom.status = 'activated';
    var G = N.G;
    G.explorationAnomaliesUsed = (G.explorationAnomaliesUsed || 0) + 1;

    if (anom.kind === 'obelisk') {
      G.B.xp = (G.B.xp || 0) + 15;
      gainExplorationEssence(40);
      // Spawn XP gems right on the player so the core level-up loop processes them cleanly
      G.gems = G.gems || [];
      G.gems.push({ x: G.P.x, y: G.P.y, val: 18, at: true, ph: 0 });
      if (N.recalc) N.recalc();
      visualBursts.push({ x: anom.x, y: anom.y, maxR: 130, col: '#70d6ff', left: 0.6, maxT: 0.6 });
      notify('ДРЕВНИЙ ОБЕЛИСК: +ОПЫТ, +40 ✦ И +15% К МУДРОСТИ', '#70d6ff');
    } else if (anom.kind === 'cursed_shrine') {
      G.B.dmg = (G.B.dmg || 0) + 25;
      G.B.mdmg = (G.B.mdmg || 0) + 25;
      gainExplorationEssence(100);
      awardSigils(2, 'Проклятый Алтарь');
      try {
        X.spawn('elite', anom.x + 55, anom.y - 25, 'fire');
      } catch (e) {}
      if (N.recalc) N.recalc();
      visualBursts.push({ x: anom.x, y: anom.y, maxR: 155, col: '#ff4757', left: 0.65, maxT: 0.65 });
      notify('ПРОКЛЯТЫЙ АЛТАРЬ: ЧЕМПИОН ПРОБУДИЛСЯ! (+25% УРОНА, +2 ❖)', '#ff4757');
    } else if (anom.kind === 'soul_well') {
      G.B.hp = (G.B.hp || 0) + 30;
      if (N.recalc) N.recalc();
      if (G.P) G.P.hp = Math.min(G.P.maxHp || 130, (G.P.hp || 100) + 60);
      if (G.minions) {
        G.minions.forEach(function (m) {
          if (m.dead) { m.dead = false; m.resp = 0; }
          m.hp = m.maxhp || 100;
        });
        G.minions.push({
          kind: 'ghost_wisp', x: anom.x, y: anom.y, vx: 0, vy: 0,
          hp: 95, maxhp: 95, dmg: 26, spd: 185, r: 10, cd: 0, resp: 0, dead: false, ang: 0, ph: 0
        });
      }
      visualBursts.push({ x: anom.x, y: anom.y, maxR: 130, col: '#8ef7c9', left: 0.6, maxT: 0.6 });
      notify('КОЛОДЕЦ ДУШ: +60 ОЗ, +30 МАКС. ОЗ И ПРИЗРАЧНЫЙ ОГОНЁК', '#8ef7c9');
    }
    updateExpHudDom();
    updateGrimoireHudDom();
    return true;
  }

  function objectiveFor(run) {
    return run ? objectiveStates.get(run) || null : null;
  }

  function descriptorFor(run, id) {
    var all = run ? run.snapshot() : [];
    for (var i = 0; i < all.length; i++) if (all[i].id === id) return all[i];
    return null;
  }

  function slotsForDescriptor(run, descriptor) {
    if (!descriptor || (descriptor.area.x === 0 && descriptor.area.y === 0)) return ENCOUNTER_SLOTS;
    return getAreaMeta(run ? run.seed : 0, descriptor.area.x, descriptor.area.y).slots;
  }

  function mutableEncounter(run, id) {
    var descriptor = descriptorFor(run, id);
    if (!descriptor || !descriptor.hostile) return null;
    var map = stateMap(run);
    if (!map.has(id)) map.set(id, {
      id: id, status: 'dormant', activation: 0,
      defeated: new Set(), live: new Map(), pending: [], clearCount: 0
    });
    return map.get(id);
  }

  function encounterView(run, id) {
    var state = mutableEncounter(run, id);
    if (!state) return null;
    var liveSlots = [];
    state.live.forEach(function (enemy, slotId) { if (enemy && !enemy.dead) liveSlots.push(slotId); });
    return {
      id: state.id, status: state.status, activation: state.activation,
      defeatedSlots: Array.from(state.defeated).sort(), liveSlots: liveSlots.sort(),
      clearCount: state.clearCount
    };
  }

  function spawnEncounterSlot(run, descriptor, state, slot, activation) {
    if (currentRun !== run || state.status !== 'active' || state.activation !== activation || state.defeated.has(slot.id)) return null;
    var existing = state.live.get(slot.id);
    if (existing && !existing.dead) return existing;

    var isOuter = descriptor.area.x !== 0 || descriptor.area.y !== 0;
    var prevDiff = null;
    if (isOuter && X.setDifficulty) {
      prevDiff = X.difficulty;
      var meta = getAreaMeta(run.seed, descriptor.area.x, descriptor.area.y);
      try { X.setDifficulty({ hp: meta.hpScale, dmg: meta.dmgScale }); } catch (e) {}
    }

    var enemy = null;
    try {
      enemy = X.spawn(slot.type, descriptor.x + slot.dx, descriptor.y + slot.dy, null);
    } catch (e) {
      try { enemy = X.spawn('zom', descriptor.x + slot.dx, descriptor.y + slot.dy, null); } catch (e2) {}
    }

    if (prevDiff && X.setDifficulty) {
      try { X.setDifficulty(prevDiff); } catch (e) {}
    }

    if (!enemy) return null;
    enemy.__explorationEncounterId = descriptor.id;
    enemy.__explorationActivation = activation;
    enemy.__explorationSlotId = slot.id;
    state.live.set(slot.id, enemy);
    return enemy;
  }

  function queueEncounterSlot(run, descriptor, state, slot, activation) {
    if (!slot.delay) {
      var enemy = spawnEncounterSlot(run, descriptor, state, slot, activation);
      if (!enemy) state.pending.push({ slot: slot, left: SPAWN_RETRY_MS / 1000, activation: activation });
      return enemy;
    }
    state.pending.push({ slot: slot, left: slot.delay / 1000, activation: activation });
    return null;
  }

  function updatePendingSlots(run, descriptor, state, dt) {
    if (!state.pending.length || state.status !== 'active') return;
    var keep = [];
    state.pending.forEach(function (pending) {
      if (pending.activation !== state.activation) return;
      pending.left -= dt;
      if (pending.left > 0) { keep.push(pending); return; }
      var enemy = spawnEncounterSlot(run, descriptor, state, pending.slot, pending.activation);
      if (!enemy) {
        pending.left = SPAWN_RETRY_MS / 1000;
        keep.push(pending);
      }
    });
    state.pending = keep;
  }

  function activateEncounter(run, descriptor) {
    var state = mutableEncounter(run, descriptor.id);
    if (!state || state.status !== 'dormant') return false;
    state.status = 'active';
    state.activation += 1;
    state.live.clear();
    state.pending = [];
    var activation = state.activation;
    var slots = slotsForDescriptor(run, descriptor);
    slots.forEach(function (slot) {
      if (!state.defeated.has(slot.id)) queueEncounterSlot(run, descriptor, state, slot, activation);
    });
    return true;
  }

  function collectDefeated(state) {
    var deadSlots = [];
    state.live.forEach(function (enemy, slotId) { if (enemy && enemy.dead) deadSlots.push(slotId); });
    deadSlots.forEach(function (slotId) { state.defeated.add(slotId); state.live.delete(slotId); });
  }

  function allDefeated(run, descriptor, state) {
    var slots = slotsForDescriptor(run, descriptor);
    return slots.every(function (slot) { return state.defeated.has(slot.id); });
  }

  function removeLiveEnemies(state) {
    if (N.G && N.G.enemies && state.live.size) {
      var refs = new Set(Array.from(state.live.values()));
      for (var i = N.G.enemies.length - 1; i >= 0; i--) if (refs.has(N.G.enemies[i])) N.G.enemies.splice(i, 1);
    }
    state.live.clear();
    state.pending = [];
  }

  function clearEncounter(run, descriptor, state) {
    if (!state || state.status !== 'active' || !allDefeated(run, descriptor, state)) return false;
    removeLiveEnemies(state);
    state.status = 'cleared';
    state.clearCount += 1;

    // Spawn interactive Corpse Mound at cleared encounter location (Feature B)
    var mMap = moundMap(run);
    if (!mMap.has(descriptor.id)) {
      mMap.set(descriptor.id, {
        id: descriptor.id,
        x: descriptor.x,
        y: descriptor.y,
        status: 'available' // 'available' | 'harvested'
      });
    }

    if (N.G) {
      N.G.explorationClearedCount = (N.G.explorationClearedCount || 0) + 1;
      var meta = getAreaMeta(run.seed, descriptor.area.x, descriptor.area.y);
      N.G.explorationMaxDanger = Math.max(N.G.explorationMaxDanger || 1, meta.danger || 1);
      gainExplorationEssence(25);
      N.G.shake = Math.max(N.G.shake || 0, 5);
    }
    visualBursts.push({ kind: 'seal_break', x: descriptor.x, y: descriptor.y, maxR: 110, col: '#8ef7c9', left: 0.65, maxT: 0.65 });
    awardSigils(1, 'Отряд зачищен');
    return true;
  }

  function disengageEncounter(run, descriptor, state) {
    if (!state || state.status !== 'active') return false;
    collectDefeated(state);
    if (allDefeated(run, descriptor, state)) return clearEncounter(run, descriptor, state);
    removeLiveEnemies(state);
    state.status = 'dormant';
    return true;
  }

  function updateEncounters(run, dt) {
    if (!run || !N.G || !N.G.P) return;
    var player = N.G.P;
    run.snapshot().filter(function (d) { return d.hostile; }).forEach(function (descriptor) {
      var state = mutableEncounter(run, descriptor.id);
      var dx = player.x - descriptor.x, dy = player.y - descriptor.y;
      var distance = Math.sqrt(dx * dx + dy * dy);
      if (state.status === 'active') {
        updatePendingSlots(run, descriptor, state, dt);
        collectDefeated(state);
        if (allDefeated(run, descriptor, state)) { clearEncounter(run, descriptor, state); return; }
        if (distance > LEASH_RADIUS) { disengageEncounter(run, descriptor, state); return; }
      }
      if (state.status === 'dormant' && distance <= ACTIVATION_RADIUS) activateEncounter(run, descriptor);
    });
  }

  function poiStateMap(run) {
    var map = poiStates.get(run);
    if (!map) { map = new Map(); poiStates.set(run, map); }
    return map;
  }

  function effectivePoiType(run, descriptor) {
    if (!descriptor) return null;
    if (descriptor.poiType) return descriptor.poiType;
    if (descriptor.area.x === 0 && descriptor.area.y === 0) return 'ruins';
    var meta = getAreaMeta(run ? run.seed : 0, descriptor.area.x, descriptor.area.y);
    return POI_CATALOG[meta.poiSubType] ? meta.poiSubType : null;
  }

  function mutablePoi(run, id) {
    var descriptor = descriptorFor(run, id);
    var pType = effectivePoiType(run, descriptor);
    if (!descriptor || !pType) return null;
    var map = poiStateMap(run);
    if (!map.has(id)) map.set(id, {
      id: id, type: pType, status: 'guarded', claimedReward: null, claimCount: 0
    });
    return map.get(id);
  }

  function poiView(run, id) {
    var state = mutablePoi(run, id);
    if (!state) return null;
    return {
      id: state.id, type: state.type, status: state.status,
      claimedReward: state.claimedReward, claimCount: state.claimCount
    };
  }

  function populatePoiModal(root, poiType) {
    var cfg = POI_CATALOG[poiType] || POI_CATALOG.ruins;
    var panel = root.querySelector('.nx-ruins-panel');
    var kicker = root.querySelector('.nx-ruins-kicker');
    var h2 = root.querySelector('h2');
    var p = root.querySelector('p');
    var choices = root.querySelector('.nx-ruins-choices');
    if (panel) panel.style.borderColor = cfg.accent || '#7a6232';
    if (kicker) { kicker.textContent = cfg.kicker; kicker.style.color = cfg.accent || '#caa95b'; }
    if (h2) h2.textContent = cfg.title;
    if (p) p.textContent = cfg.sub;
    if (choices) {
      choices.innerHTML = '';
      cfg.rewards.forEach(function (reward) {
        var button = document.createElement('button');
        button.type = 'button';
        button.className = 'nx-ruins-choice';
        button.setAttribute('data-ruins-reward', reward.id);
        button.innerHTML = '<b>' + reward.name + '</b><span>' + reward.desc + '</span>';
        button.addEventListener('click', function () {
          if (root._poiId) claimRuins(root._run, root._game, root._poiId, reward.id);
        });
        choices.appendChild(button);
      });
    }
  }

  function ensureRuinsRewardUi() {
    var root = document.getElementById('nxRuinsReward');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'nxRuinsReward';
    root.className = 'nx-ruins-reward hidden';
    root.innerHTML = '<div class="nx-ruins-panel">' +
      '<div class="nx-ruins-kicker">МЕСТО СИЛЫ ЗАЧИЩЕНО</div>' +
      '<h2>РУИНЫ ПОМНЯТ СИЛУ</h2>' +
      '<p>Бой остановлен. Выбери один дар для этой экспедиции.</p>' +
      '<div class="nx-ruins-choices"></div></div>';
    populatePoiModal(root, 'ruins');
    window.addEventListener('keydown', function (event) {
      if (root.classList.contains('hidden')) return;
      if (event.code === 'Tab') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      if ((event.code === 'Enter' || event.code === 'Space') && root.contains(document.activeElement) && document.activeElement.click) document.activeElement.click();
    }, true);
    document.body.appendChild(root);
    return root;
  }

  function hideRuinsReward() {
    rewardOpenQueued = null;
    var root = document.getElementById('nxRuinsReward');
    if (!root) return;
    root.classList.add('hidden');
    root._poiId = null;
    root._run = null;
    root._game = null;
    root._pausedByRuins = false;
  }

  function invalidateRuinsReward() {
    var root = document.getElementById('nxRuinsReward');
    var resume = !!(root && !root.classList.contains('hidden') && root._pausedByRuins && root._game === N.G && N.state === 'pause');
    hideRuinsReward();
    if (resume) N.state = 'play';
  }

  function showRuinsReward(run, id) {
    if (!run || currentRun !== run || !N.G || currentGame !== N.G || N.state !== 'play' || X.mode !== 'exploration') return false;
    var poi = mutablePoi(run, id);
    var root = ensureRuinsRewardUi();
    populatePoiModal(root, poi ? poi.type : 'ruins');
    root._poiId = id;
    root._run = run;
    root._game = N.G;
    root._pausedByRuins = true;
    root.classList.remove('hidden');
    N.state = 'pause';
    return true;
  }

  function queueRuinsReward(run, id) {
    if (rewardOpenQueued && rewardOpenQueued.run === run && rewardOpenQueued.id === id) return;
    rewardOpenQueued = { run: run, id: id };
    var open = function () {
      var queued = rewardOpenQueued;
      rewardOpenQueued = null;
      if (!queued || queued.run !== run || queued.id !== id) return;
      showRuinsReward(run, id);
    };
    if (typeof queueMicrotask === 'function') queueMicrotask(open);
    else Promise.resolve().then(open);
  }

  function rewardDef(id) {
    for (var i = 0; i < ALL_REWARDS.length; i++) if (ALL_REWARDS[i].id === id) return ALL_REWARDS[i];
    return null;
  }

  function claimRuins(run, game, id, rewardId) {
    if (!run || currentRun !== run || !game || currentGame !== game || N.G !== game || X.mode !== 'exploration') return false;
    var state = mutablePoi(run, id);
    var reward = rewardDef(rewardId);
    if (!state || state.status !== 'reward-ready' || !reward) return false;
    reward.apply(game);
    game.explorationRewards = game.explorationRewards || [];
    game.explorationRewards.push({ poiId: id, poiType: state.type, rewardId: reward.id, name: reward.name });
    if (N.recalc) N.recalc();
    state.claimedReward = reward.id;
    state.claimCount += 1;
    state.status = 'cleared';

    // Advance Expedition Seal Objective (Feature A)
    var obj = objectiveFor(run);
    if (obj) {
      obj.seals += 1;
      game.explorationSeals = obj.seals;
      expMeta.totalSeals = (expMeta.totalSeals || 0) + 1;
      if (obj.seals >= obj.requiredSeals && !obj.unlocked) {
        obj.unlocked = true;
        if (obj.citadel.status === 'locked') obj.citadel.status = 'available';
        notify('3 ПЕЧАТИ СОБРАНЫ! ОТКРЫТЫ ВРАТА ИСХОДА (0,0) И ЦИТАДЕЛЬ ВЛАДЫКИ', '#ffd23f');
      }
    }
    if (expMeta.activeRelic === 'blood_compass') {
      game.B.dmg = (game.B.dmg || 0) + 12;
      if (game.P) game.P.hp = Math.min(game.P.maxHp || 100, (game.P.hp || 100) + 35);
      if (N.recalc) N.recalc();
    }
    gainExplorationEssence(30);
    awardSigils(2, 'Печать Места Силы');
    var poiDesc = descriptorFor(run, id);
    if (poiDesc) {
      visualBursts.push({ kind: 'seal_claim', x: poiDesc.x, y: poiDesc.y, maxR: 145, col: '#ffd23f', left: 0.85, maxT: 0.85 });
    }
    if (game) game.shake = Math.max(game.shake || 0, 6);

    var root = document.getElementById('nxRuinsReward');
    var resume = !!(root && !root.classList.contains('hidden') && root._pausedByRuins && root._run === run && root._game === game && N.state === 'pause');
    hideRuinsReward();
    if (resume) N.state = 'play';
    return true;
  }

  function updatePois(run) {
    if (!run) return;
    run.snapshot().forEach(function (descriptor) {
      var pType = effectivePoiType(run, descriptor);
      if (!pType) return;
      var poi = mutablePoi(run, descriptor.id);
      var encounter = mutableEncounter(run, descriptor.id);
      if (poi.status === 'guarded' && encounter && encounter.status === 'cleared') poi.status = 'reward-ready';
      if (poi.status === 'reward-ready' && N.state === 'play') queueRuinsReward(run, descriptor.id);
    });
  }

  /* ---------- FEATURE A: CITADEL BOSS & SANCTUARY EXTRACTION ---------- */
  function completeExpeditionWin(run, kind) {
    if (!run || !N.G || N.state !== 'play') return false;
    var G = N.G;
    var obj = objectiveFor(run);
    if (obj) obj.extracted = true;
    G.won = true;
    G.explorationOutcome = kind; // 'boss_triumph' | 'sanctuary_extraction'
    expMeta.runsCompleted = (expMeta.runsCompleted || 0) + 1;
    if (kind === 'boss_triumph') {
      G.explorationBossSlain = true;
      G.explorationMaxDanger = Math.max(G.explorationMaxDanger || 1, 4);
      expMeta.bossesSlain = (expMeta.bossesSlain || 0) + 1;
      awardSigils(10, 'Триумф над Владыкой');
    } else {
      awardSigils(5, 'Успешный Исход');
    }
    N.state = 'win';
    var winOv = document.getElementById('winOv');
    if (winOv) {
      var titleEl = winOv.querySelector('.title');
      var subEl = winOv.querySelector('.sub');
      if (titleEl) {
        titleEl.textContent = kind === 'boss_triumph' ? 'ВЛАДЫКА ЭКСПЕДИЦИИ ПОВЕРЖЕН' : 'ИСХОД ЗАВЕРШЁН · ЭКСПЕДИЦИЯ УСПЕШНА';
      }
      if (subEl) {
        subEl.textContent = kind === 'boss_triumph'
          ? 'ЦИТАДЕЛЬ ПЕПЛА ЗАЧИЩЕНА · ТРИУМФ НЕКРОМАНТА'
          : 'ДАРЫ И РЕЛИКВИИ ВЫНЕСЕНЫ ЧЕРЕЗ СВЯТИЛИЩЕ';
      }
      var wt = document.getElementById('wtime');
      if (wt) {
        var mins = Math.floor((G.time || 0) / 60);
        var secs = Math.floor((G.time || 0) % 60);
        wt.textContent = (mins < 10 ? '0' + mins : mins) + ':' + (secs < 10 ? '0' + secs : secs);
      }
      var wk = document.getElementById('wkills');
      if (wk) wk.textContent = String(G.kills || 0);
      var wl = document.getElementById('wlvl');
      if (wl) wl.textContent = String(G.level || 1);
      var ws = document.getElementById('wsouls');
      if (ws) ws.textContent = '+' + String(G.soulsGained || 0) + ' ◆';
      winOv.classList.remove('hidden');
    }
    return true;
  }

  function spawnCitadelBoss(run) {
    var obj = objectiveFor(run);
    if (!obj || !N.G) return null;
    if (obj.citadel.boss && !obj.citadel.boss.dead) return obj.citadel.boss;
    var prevDiff = X.difficulty;
    if (X.setDifficulty) {
      try { X.setDifficulty({ hp: 2.2, dmg: 1.6 }); } catch (e) {}
    }
    var boss = X.spawn('boss', obj.citadel.x, obj.citadel.y, 'fire');
    if (prevDiff && X.setDifficulty) {
      try { X.setDifficulty(prevDiff); } catch (e) {}
    }
    if (boss) {
      boss.__isCitadelBoss = true;
      obj.citadel.boss = boss;
      obj.citadel.status = 'active';
      N.G.explorationMaxDanger = Math.max(N.G.explorationMaxDanger || 1, 4);
      N.G.shake = Math.max(N.G.shake || 0, 10);
      visualBursts.push({ kind: 'detonate', x: obj.citadel.x, y: obj.citadel.y, maxR: 185, col: '#ff4757', left: 0.85, maxT: 0.85 });
      notify('ВЛАДЫКА ЦИТАДЕЛИ ПРОБУДИЛСЯ! (УГРОЗА IV)', '#ff4757');
    }
    return boss;
  }

  function updateObjective(run) {
    if (!run || !N.G || !N.G.P) return;
    var obj = objectiveFor(run);
    if (!obj || !obj.unlocked) return;
    var P = N.G.P;
    var cit = obj.citadel;
    var distCit = Math.hypot(P.x - cit.x, P.y - cit.y);

    if (cit.status === 'available' && distCit <= ACTIVATION_RADIUS + 50) {
      spawnCitadelBoss(run);
    } else if (cit.status === 'active') {
      if (cit.boss && cit.boss.dead) {
        cit.status = 'cleared';
        completeExpeditionWin(run, 'boss_triumph');
      } else if (distCit > LEASH_RADIUS + 180 && cit.boss && !cit.boss.dead) {
        var idx = N.G.enemies.indexOf(cit.boss);
        if (idx !== -1) N.G.enemies.splice(idx, 1);
        cit.boss = null;
        cit.status = 'available';
        notify('ВЛАДЫКА ЦИТАДЕЛИ ВЕРНУЛСЯ К ТРОНУ', '#caa95b');
      }
    }
  }

  function triggerSanctuaryExtraction() {
    var run = ensureRun();
    if (!run || !N.G || !N.G.P || N.state !== 'play') return false;
    var obj = objectiveFor(run);
    if (!obj || !obj.unlocked) {
      notify('ДЛЯ ОТКРЫТИЯ ВРАТ ИСХОДА НУЖНО 3 ПЕЧАТИ МЕСТ СИЛЫ', '#ff6b7f');
      return false;
    }
    var distHome = Math.hypot(N.G.P.x, N.G.P.y);
    if (distHome > SAFE_RADIUS + 40) {
      notify('ВЕРНИСЬ В СТАРТОВОЕ СВЯТИЛИЩЕ (0, 0) ДЛЯ ЭВАКУАЦИИ', '#ffd23f');
      return false;
    }
    return completeExpeditionWin(run, 'sanctuary_extraction');
  }

  /* ---------- FEATURE B: FIELD NECROMANCY (CORPSE MOUNDS & FOCUS BANNER) ---------- */
  function nearestAvailableMound(run) {
    if (!run || !N.G || !N.G.P) return null;
    var P = N.G.P;
    var best = null;
    var bestDist = Infinity;
    moundMap(run).forEach(function (m) {
      if (m.status !== 'available') return;
      var d = Math.hypot(m.x - P.x, m.y - P.y);
      if (d <= MOUND_INTERACT_RADIUS && d < bestDist) {
        best = m;
        bestDist = d;
      }
    });
    return best;
  }

  function harvestMound(mode) {
    var run = ensureRun();
    if (!run || !N.G || !N.G.P || N.state !== 'play') return false;
    var mound = nearestAvailableMound(run);
    if (!mound) return false;
    mound.status = 'harvested';
    mound.harvestMode = mode;
    var G = N.G;
    G.explorationMoundsHarvested = (G.explorationMoundsHarvested || 0) + 1;

    var lanternBonus = expMeta.activeRelic === 'soul_lantern' ? 25 : 0;
    var wardHealBonus = (expMeta.upgrades.ward_seal || 0) * 12;
    var alchLvl = (G.explorationPerks && G.explorationPerks.corpse_alchemist) || 0;
    var alchEss = alchLvl * 35;

    if (mode === 'raise') {
      // Revive any fallen minions + grant +15% minion damage + spawn bone vanguard
      G.B.mdmg = (G.B.mdmg || 0) + 15 + alchLvl * 10;
      if (!G.weapons.warriors) {
        G.weapons.warriors = { id: 'warriors', lvl: 1, timer: 0 };
        G.lvls = G.lvls || {};
        G.lvls.warriors = Math.max(1, G.lvls.warriors || 1);
      }
      if (G.minions) {
        G.minions.forEach(function (m) {
          m.dead = false;
          m.resp = 0;
          m.hp = m.maxhp || 90;
        });
        var extraCount = 1 + alchLvl;
        var sample = G.minions[0];
        for (var ri = 0; ri < extraCount; ri++) {
          G.minions.push({
            kind: 'warriors',
            x: mound.x + 16 + ri * 14,
            y: mound.y + (ri % 2 ? 10 : -10),
            vx: 0, vy: 0,
            hp: sample ? sample.maxhp : 110,
            maxhp: sample ? sample.maxhp : 110,
            dmg: sample ? sample.dmg : 24,
            spd: sample ? sample.spd : 145,
            r: 11, cd: 0, resp: 0, dead: false, ang: 0
          });
        }
      }
      gainExplorationEssence(20 + lanternBonus + alchEss);
      if (N.recalc) N.recalc();
      G.shake = Math.max(G.shake || 0, 5);
      visualBursts.push({ kind: 'mound_raise', x: mound.x, y: mound.y, maxR: 98, col: '#8ef7c9', left: 0.68, maxT: 0.68 });
      notify('ВОССТАНИЕ ИЗ КУРГАНА: +' + (1 + alchLvl) + ' ВОИН(А) И +' + (20 + lanternBonus + alchEss) + ' ✦', '#8ef7c9');
    } else {
      // Blood & Soul Siphon: heal +40 HP and +35 Ult charge +45 Essence
      var healAmt = 40 + wardHealBonus + alchLvl * 20;
      if (G.P) {
        G.P.hp = Math.min(G.P.maxHp || 100, (G.P.hp || 100) + healAmt);
      }
      G.ult = Math.min(100, (G.ult || 0) + 35);
      gainExplorationEssence(45 + lanternBonus + alchEss);
      G.shake = Math.max(G.shake || 0, 4);
      visualBursts.push({
        kind: 'mound_siphon',
        x: mound.x, y: mound.y,
        tx: G.P ? G.P.x : mound.x,
        ty: G.P ? G.P.y : mound.y,
        maxR: 92, col: '#ff6b7f', left: 0.68, maxT: 0.68
      });
      notify('ПОГЛОЩЕНИЕ ПРАХА: +' + healAmt + ' ОЗ, +35% ГНЕВА И +' + (45 + lanternBonus + alchEss) + ' ✦', '#ff6b7f');
    }
    updateExpHudDom();
    updateGrimoireHudDom();
    return true;
  }

  function placeFocusBannerAt(wx, wy) {
    if (!N.G || !N.G.P) return null;
    var bannerPerkLvl = (N.G.explorationPerks && N.G.explorationPerks.banner_lord) || 0;
    var dur = 10 + (expMeta.upgrades.marshal_banner || 0) * 2.5 + bannerPerkLvl * 4;
    focusBanner = {
      x: Math.round(wx),
      y: Math.round(wy),
      left: dur,
      maxT: dur
    };
    if (bannerPerkLvl > 0) {
      var novaR = 135;
      var novaDmg = 45 * bannerPerkLvl;
      (N.G.enemies || []).forEach(function (e) {
        if (e.dead) return;
        if (Math.hypot(e.x - focusBanner.x, e.y - focusBanner.y) <= novaR + (e.r || 12)) {
          e.hp -= novaDmg;
          e.hitT = 0.2;
          e.slowT = Math.max(e.slowT || 0, 2.5);
          if (e.hp <= 0) e.dead = true;
        }
      });
      N.G.shake = Math.max(N.G.shake || 0, 6);
      visualBursts.push({ kind: 'banner_drop', x: focusBanner.x, y: focusBanner.y, maxR: novaR, col: '#ffd23f', left: 0.55, maxT: 0.55 });
    } else {
      visualBursts.push({ kind: 'banner_drop', x: focusBanner.x, y: focusBanner.y, maxR: 78, col: '#ffd23f', left: 0.48, maxT: 0.48 });
    }
    notify('ЗНАМЯ ОХОТЫ УСТАНОВЛЕНО: ЛЕГИОН АТАКУЕТ ТОЧКУ', '#ffd23f');
    updateExpHudDom();
    return focusBanner;
  }

  /* ---------- STAGE D1: SECTOR ANOMALIES & STAGE D2: LEVEL-UP PERKS ---------- */
  function anomalyMap(run) {
    var map = anomalyStates.get(run);
    if (!map) {
      map = new Map();
      anomalyStates.set(run, map);
    }
    return map;
  }

  function ensureSectorAnomaly(run, ax, ay) {
    if (!run || (ax === 0 && ay === 0)) return null;
    var meta = getAreaMeta(run.seed, ax, ay);
    if (!meta || !meta.anomaly) return null;
    var map = anomalyMap(run);
    var rec = map.get(meta.anomaly.id);
    if (!rec) {
      rec = {
        id: meta.anomaly.id,
        kind: meta.anomaly.kind,
        title: meta.anomaly.title,
        short: meta.anomaly.short,
        col: meta.anomaly.col,
        area: { x: ax, y: ay },
        x: meta.anomaly.x,
        y: meta.anomaly.y,
        status: 'available'
      };
      map.set(rec.id, rec);
    }
    return rec;
  }

  function nearestAvailableAnomaly(run) {
    if (!run || !N.G || !N.G.P) return null;
    var P = N.G.P;
    var best = null;
    var bestD2 = ANOMALY_INTERACT_RADIUS * ANOMALY_INTERACT_RADIUS;
    anomalyMap(run).forEach(function (a) {
      if (a.status !== 'available') return;
      var dx = a.x - P.x, dy = a.y - P.y;
      var d2 = dx * dx + dy * dy;
      if (d2 <= bestD2) {
        bestD2 = d2;
        best = a;
      }
    });
    return best;
  }

  function activateNearestAnomaly(forcedKind) {
    var run = ensureRun();
    if (!run || !N.G || !N.G.P || N.state !== 'play') return false;
    var anom = nearestAvailableAnomaly(run);
    if (!anom) return false;
    anom.status = 'activated';
    var G = N.G;
    var P = G.P;
    G.explorationAnomaliesUsed = (G.explorationAnomaliesUsed || 0) + 1;
    var kind = forcedKind || anom.kind;

    if (kind === 'obelisk') {
      var curAx = anom.area.x, curAy = anom.area.y;
      for (var dx = -2; dx <= 2; dx++) {
        for (var dy = -2; dy <= 2; dy++) {
          if (Math.abs(dx) + Math.abs(dy) <= 2) {
            run.visitArea(curAx + dx, curAy + dy);
            ensureSectorAnomaly(run, curAx + dx, curAy + dy);
          }
        }
      }
      gainExplorationEssence(55);
      G.B.spd = (G.B.spd || 0) + 8;
      if (N.recalc) N.recalc();
      G.shake = Math.max(G.shake || 0, 6);
      visualBursts.push({ kind: 'anomaly_flare', anomKind: 'obelisk', x: anom.x, y: anom.y, maxR: 210, col: '#8ef7c9', left: 0.75, maxT: 0.75 });
      notify('ОБЕЛИСК ПРОЗРЕНИЯ: ОКРЕСТНЫЕ СЕКТОРЫ ОТКРЫТЫ (+55 ✦, +8% СКОРОСТИ)', '#8ef7c9');
    } else if (kind === 'soul_well') {
      gainExplorationEssence(100);
      grimoireCds = { bastion: 0, detonate: 0, dreadknight: 0, rift: 0 };
      P.hp = Math.min(P.maxHp || 100, (P.hp || 100) + 35);
      if (G.minions) {
        G.minions.forEach(function (m) {
          m.dead = false;
          m.resp = 0;
          m.hp = m.maxhp || 110;
        });
      }
      G.shake = Math.max(G.shake || 0, 6);
      visualBursts.push({ kind: 'anomaly_flare', anomKind: 'soul_well', x: anom.x, y: anom.y, maxR: 175, col: '#b657ff', left: 0.72, maxT: 0.72 });
      notify('КОЛОДЕЦ ДУШ: +100 ✦ ЭССЕНЦИИ, СБРОС ОТКАТОВ ГРИМУАРА И ИСЦЕЛЕНИЕ СВИТЫ', '#b657ff');
    } else {
      var costHp = Math.max(5, Math.floor((P.hp || 80) * 0.2));
      P.hp = Math.max(15, (P.hp || 80) - costHp);
      awardSigils(1);
      G.B.dmg = (G.B.dmg || 0) + 25;
      G.B.mdmg = (G.B.mdmg || 0) + 25;
      if (G.minions) {
        G.minions.push({
          kind: 'bone_knight',
          x: anom.x + 22, y: anom.y + 10, vx: 0, vy: 0,
          hp: 250, maxhp: 250, dmg: 44, spd: 148, r: 14, cd: 0, resp: 0, dead: false, ang: 0, ph: 0
        });
      }
      if (N.recalc) N.recalc();
      G.shake = Math.max(G.shake || 0, 8);
      visualBursts.push({ kind: 'anomaly_flare', anomKind: 'cursed_shrine', x: anom.x, y: anom.y, maxR: 185, col: '#ff5e6c', left: 0.75, maxT: 0.75 });
      notify('АЛТАРЬ КРОВИ: +1 ❖ ПЕЧАТЬ ИСХОДА, +25% МОЩИ И РЫЦАРЬ КОСТИ!', '#ff6b7f');
    }
    updateExpHudDom();
    updateGrimoireHudDom();
    return true;
  }

  function applyExpeditionPerkById(perkId) {
    if (!N.G) return false;
    var perk = null;
    for (var i = 0; i < EXPEDITION_PERKS.length; i++) {
      if (EXPEDITION_PERKS[i].id === perkId) { perk = EXPEDITION_PERKS[i]; break; }
    }
    if (!perk) return false;
    perk.apply(N.G);
    if (N.recalc) N.recalc();
    notify('ТАКТИКА ЭКСПЕДИЦИИ: ' + perk.name, perk.col || '#ffd23f');
    updateExpHudDom();
    updateGrimoireHudDom();
    return true;
  }

  function enhanceLevelUpDraft() {
    if (X.mode !== 'exploration' || !N.G) return;
    var lvEl = document.getElementById('levelup');
    var cardsEl = document.getElementById('cards');
    if (!lvEl || !cardsEl || lvEl.classList.contains('hidden')) return;
    if ((N.G.level || 1) < 2) return;
    if (cardsEl.querySelector('.nx-exp-perk-card')) return;
    var baseCards = cardsEl.querySelectorAll('.card');
    if (!baseCards.length) return;

    var idx = ((N.G.level || 2) + ((currentRun && currentRun.seed) || 0)) % EXPEDITION_PERKS.length;
    var perk = EXPEDITION_PERKS[Math.abs(idx) % EXPEDITION_PERKS.length];
    var rank = ((N.G.explorationPerks && N.G.explorationPerks[perk.id]) || 0) + 1;

    var card = document.createElement('div');
    card.className = 'card nx-exp-perk-card';
    card.setAttribute('data-exp-perk', perk.id);
    card.innerHTML =
      '<div class="tag" style="color:' + perk.col + '">✦ ' + perk.badge + ' · РАНГ ' + rank + '</div>' +
      '<h3>' + perk.name + '</h3>' +
      '<div class="lv">ОСОБЫЙ ТАЛАНТ ПОХОДА</div>' +
      '<p>' + perk.desc + '</p>';

    card.onclick = function () {
      var g = N.G;
      if (!g) return;
      var snapLvls = JSON.parse(JSON.stringify(g.lvls || {}));
      var snapWeapons = JSON.parse(JSON.stringify(g.weapons || {}));
      var snapB = JSON.parse(JSON.stringify(g.B || {}));
      var snapMinionLen = g.minions ? g.minions.length : 0;
      var snapHp = g.P ? g.P.hp : 100;
      var snapMaxHp = g.P ? g.P.maxHp : 100;

      if (typeof baseCards[0].onclick === 'function') {
        baseCards[0].onclick();
      }
      g.lvls = snapLvls;
      g.weapons = snapWeapons;
      g.B = snapB;
      if (g.minions && g.minions.length > snapMinionLen) {
        g.minions.length = snapMinionLen;
      }
      if (g.P) {
        g.P.maxHp = snapMaxHp;
        g.P.hp = snapHp;
      }
      applyExpeditionPerkById(perk.id);
    };

    cardsEl.appendChild(card);
  }

  function placeFocusBannerForward() {
    if (!N.G || !N.G.P) return null;
    var P = N.G.P;
    return placeFocusBannerAt(P.x + lastMoveDir.x * 210, P.y + lastMoveDir.y * 210);
  }

  // Right-click on canvas in Exploration mode places the Legion Focus Banner
  window.addEventListener('contextmenu', function (ev) {
    if (X.mode !== 'exploration' || N.state !== 'play' || !N.G || !N.G.P || !N.cam) return;
    var cv = document.getElementById('cv');
    if (ev.target !== cv) return;
    ev.preventDefault();
    var cam = N.cam();
    var dx = ev.clientX - cam.w / 2;
    var dy = ev.clientY - cam.h / 2;
    placeFocusBannerAt(N.G.P.x + dx, N.G.P.y + dy);
  });

  function freshSeed() {
    if (forcedNextSeed != null && Number.isInteger(forcedNextSeed) && forcedNextSeed >= 0) {
      var chosen = forcedNextSeed >>> 0;
      forcedNextSeed = null;
      return chosen;
    }
    var v = new Uint32Array(1);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(v);
      return v[0] >>> 0;
    }
    return mix32((Date.now() ^ Math.floor((window.performance?.now() || 0) * 1000)) >>> 0);
  }

  function ensureRun() {
    if (X.mode !== 'exploration' || !N.G) return null;
    if (currentGame !== N.G) {
      invalidateRuinsReward();
      currentGame = N.G;
      currentRun = createWorld(freshSeed());
      currentGame.explorationSeed = currentRun.seed;
      currentGame.explorationSeals = 0;
      currentGame._lastBiomeSector = '0,0';
      focusBanner = null;
      applySanctuaryToRun(currentGame);
      currentRun.visitArea(0, 0);
    }
    return currentRun;
  }

  /* ---------- ТАКТИЧЕСКОЕ УПРАВЛЕНИЕ ЛЕГИОНОМ ---------- */
  function applyLegionTactics(dt) {
    if (!N.G || !N.G.P) return;
    var P = N.G.P;
    if (P._lastX != null && P._lastY != null) {
      var mdx = P.x - P._lastX, mdy = P.y - P._lastY;
      var mlen = Math.sqrt(mdx * mdx + mdy * mdy);
      if (mlen > 0.5) { lastMoveDir.x = mdx / mlen; lastMoveDir.y = mdy / mlen; }
    }
    P._lastX = P.x; P._lastY = P.y;

    if (focusBanner) {
      focusBanner.left -= (dt || 0.016);
      if (focusBanner.left <= 0) focusBanner = null;
    }

    if (!N.G.minions || !N.G.minions.length) return;
    var alive = N.G.minions.filter(function (m) { return !m.dead; });
    if (!alive.length) return;
    var step = Math.min(1, (dt || 0.016) * 5.5);

    if (focusBanner) {
      alive.forEach(function (m, idx) {
        var ang = (idx / Math.max(1, alive.length)) * Math.PI * 2 + (N.G.time || 0) * 1.2;
        var tx = focusBanner.x + Math.cos(ang) * 38;
        var ty = focusBanner.y + Math.sin(ang) * 38;
        m.x += (tx - m.x) * (step * 0.85);
        m.y += (ty - m.y) * (step * 0.85);
      });
      return;
    }

    if (legionStance === 'hunt') return;
    alive.forEach(function (m, idx) {
      var angle = (idx / Math.max(1, alive.length)) * Math.PI * 2 + (N.G.time || 0) * 0.9;
      if (legionStance === 'guard') {
        var gx = P.x + Math.cos(angle) * 52;
        var gy = P.y + Math.sin(angle) * 52;
        m.x += (gx - m.x) * step;
        m.y += (gy - m.y) * step;
      } else if (legionStance === 'vanguard') {
        var spread = (idx - (alive.length - 1) / 2) * 32;
        var perpX = -lastMoveDir.y, perpY = lastMoveDir.x;
        var vx = P.x + lastMoveDir.x * 115 + perpX * spread;
        var vy = P.y + lastMoveDir.y * 115 + perpY * spread;
        m.x += (vx - m.x) * (step * 0.65);
        m.y += (vy - m.y) * (step * 0.65);
      }
    });
  }

  function cycleLegionStance() {
    focusBanner = null;
    legionStance = legionStance === 'hunt' ? 'vanguard' : legionStance === 'vanguard' ? 'guard' : 'hunt';
    updateExpHudDom();
    return legionStance;
  }

  window.addEventListener('keydown', function (e) {
    if (X.mode !== 'exploration' || N.state !== 'play') return;
    if (e.repeat) return;
    if (e.code === 'KeyE') {
      cycleLegionStance();
    } else if (e.code === 'KeyR') {
      harvestMound('raise');
    } else if (e.code === 'KeyQ') {
      harvestMound('siphon');
    } else if (e.code === 'Digit1') {
      castFieldSkill('bastion');
    } else if (e.code === 'Digit2') {
      castFieldSkill('detonate');
    } else if (e.code === 'Digit3') {
      castFieldSkill('dreadknight');
    } else if (e.code === 'Digit4') {
      castFieldSkill('rift');
    } else if (e.code === 'KeyG') {
      activateNearestAnomaly();
    } else if (e.code === 'KeyF') {
      var run = ensureRun();
      var obj = objectiveFor(run);
      if (obj && obj.unlocked && N.G && N.G.P && Math.hypot(N.G.P.x, N.G.P.y) <= SAFE_RADIUS + 40) {
        triggerSanctuaryExtraction();
      } else {
        placeFocusBannerForward();
      }
    }
  });

  function updateGrimoireState(dt) {
    if (!N.G || !N.G.P) return;
    var d = dt || 0;
    for (var k in grimoireCds) {
      if (grimoireCds[k] > 0) grimoireCds[k] = Math.max(0, grimoireCds[k] - d);
    }
    var inSanctum = Math.hypot(N.G.P.x, N.G.P.y) <= SAFE_RADIUS;
    var regenMult = 1 + (expMeta.upgrades.essence_vessel || 0) * 0.2;
    var regenRate = (inSanctum ? 6.0 : 2.5) * regenMult;
    gainExplorationEssence(regenRate * d);

    if (visualBursts.length) {
      var keep = [];
      for (var i = 0; i < visualBursts.length; i++) {
        var b = visualBursts[i];
        b.left -= d;
        if (b.left > 0) keep.push(b);
      }
      visualBursts = keep;
    }
  }

  function simTick(dt) {
    var run = ensureRun();
    if (!run || !N.G || !N.G.P) return;
    var ax = Math.round(N.G.P.x / AREA_SIZE);
    var ay = Math.round(N.G.P.y / AREA_SIZE);
    run.visitArea(ax, ay);
    ensureSectorAnomaly(run, ax, ay);

    var sectorKey = ax + ',' + ay;
    if (N.G._lastBiomeSector === undefined) N.G._lastBiomeSector = '0,0';
    if (sectorKey !== N.G._lastBiomeSector) {
      N.G._lastBiomeSector = sectorKey;
      var secMeta = getAreaMeta(run.seed, ax, ay);
      if (secMeta && typeof secMeta.biomeIdx === 'number') {
        N.G.biomeIdx = secMeta.biomeIdx;
      }
    }

    if (Math.hypot(N.G.P.x, N.G.P.y) > SAFE_RADIUS + 80) {
      for (var dx = -1; dx <= 1; dx++) {
        for (var dy = -1; dy <= 1; dy++) {
          if (dx === 0 && dy === 0) continue;
          var preview = describeArea(run.seed, ax + dx, ay + dy)[0];
          if (preview && Math.hypot(preview.x - N.G.P.x, preview.y - N.G.P.y) <= LEASH_RADIUS + 120) {
            run.visitArea(ax + dx, ay + dy);
            ensureSectorAnomaly(run, ax + dx, ay + dy);
          }
        }
      }
    }
    updateEncounters(run, dt || 0);
    updatePois(run);
    updateObjective(run);
    updateGrimoireState(dt || 0);
    applyLegionTactics(dt || 0);
    enhanceLevelUpDraft();
    updateExpHudDom();
    updateGrimoireHudDom();
  }

  /* ---------- STAGE B + OBJECTIVE & MOUNDS ON-CANVAS GEOMETRY (HANDCRAFTED ART PASS A) ---------- */
  var EXP_INK = 'rgba(11, 7, 17, 0.92)';
  var expGlowCache = {};
  var expShadowCanvas = null;

  function getExpGlow(hex) {
    var key = hex || '#8ef7c9';
    if (expGlowCache[key]) return expGlowCache[key];
    if (typeof document === 'undefined') return null;
    var c = document.createElement('canvas');
    c.width = c.height = 64;
    var q = c.getContext('2d');
    if (!q) return null;
    var r = 142, g = 247, b = 201;
    if (key.charAt(0) === '#' && key.length >= 7) {
      r = parseInt(key.slice(1, 3), 16) || 142;
      g = parseInt(key.slice(3, 5), 16) || 247;
      b = parseInt(key.slice(5, 7), 16) || 201;
    }
    var gr = q.createRadialGradient(32, 32, 2, 32, 32, 31);
    gr.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',0.95)');
    gr.addColorStop(0.38, 'rgba(' + r + ',' + g + ',' + b + ',0.35)');
    gr.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    q.fillStyle = gr;
    q.fillRect(0, 0, 64, 64);
    expGlowCache[key] = c;
    return c;
  }

  function drawExpGlow(ctx, hex, x, y, r, alpha) {
    var img = getExpGlow(hex);
    if (!img || !ctx.drawImage) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha == null ? 0.65 : Math.max(0, Math.min(1, alpha));
    ctx.drawImage(img, x - r, y - r, r * 2, r * 2);
    ctx.restore();
  }

  function drawExpShadow(ctx, x, y, rx, ry, alpha) {
    if (!expShadowCanvas && typeof document !== 'undefined') {
      var c = document.createElement('canvas');
      c.width = c.height = 64;
      var q = c.getContext('2d');
      if (q) {
        var g = q.createRadialGradient(32, 32, 4, 32, 32, 30);
        g.addColorStop(0, 'rgba(0,0,0,0.62)');
        g.addColorStop(0.65, 'rgba(0,0,0,0.28)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        q.fillStyle = g;
        q.fillRect(0, 0, 64, 64);
        expShadowCanvas = c;
      }
    }
    if (expShadowCanvas && ctx.drawImage) {
      ctx.save();
      ctx.globalAlpha = alpha == null ? 0.85 : alpha;
      ctx.drawImage(expShadowCanvas, x - rx, y - ry, rx * 2, ry * 2);
      ctx.restore();
    }
  }

  function expStrokeInk(ctx, w) {
    ctx.strokeStyle = EXP_INK;
    ctx.lineWidth = w || 1.6;
    ctx.stroke();
  }

  function drawMiniSkull(ctx, x, y, sc, eyeCol) {
    sc = sc || 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(sc, sc);
    ctx.fillStyle = '#ddd3b8';
    ctx.beginPath();
    ctx.arc(0, -1.2, 4.2, 0, Math.PI * 2);
    ctx.fill();
    expStrokeInk(ctx, 1.2);
    ctx.fillStyle = '#bfb393';
    ctx.fillRect(-2.1, 1.4, 4.2, 2.1);
    ctx.fillStyle = '#0b0614';
    ctx.beginPath();
    ctx.arc(-1.5, -1.3, 1.05, 0, Math.PI * 2);
    ctx.arc(1.5, -1.3, 1.05, 0, Math.PI * 2);
    ctx.fill();
    if (eyeCol) {
      ctx.fillStyle = eyeCol;
      ctx.beginPath();
      ctx.arc(-1.5, -1.3, 0.55, 0, Math.PI * 2);
      ctx.arc(1.5, -1.3, 0.55, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawRunePerimeter(ctx, sx, sy, radius, color, isActive, proximityAlpha, t) {
    var baseAlpha = isActive ? 0.55 : Math.max(0.08, Math.min(0.32, proximityAlpha));
    ctx.save();
    ctx.strokeStyle = color;
    ctx.globalAlpha = baseAlpha;
    ctx.lineWidth = isActive ? 2.2 : 1.3;
    ctx.setLineDash(isActive ? [10, 6] : [5, 11]);
    ctx.lineDashOffset = isActive ? -t * 22 : -t * 6;
    ctx.beginPath();
    ctx.arc(sx, sy, radius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 8 cardinal rune notches along the perimeter
    var count = isActive ? 12 : 8;
    for (var i = 0; i < count; i++) {
      var a = (i / count) * Math.PI * 2 + (isActive ? t * 0.25 : 0);
      var nx = sx + Math.cos(a) * radius;
      var ny = sy + Math.sin(a) * radius;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(nx, ny, isActive ? 2.6 : 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawSanctumRing(ctx, run, cam) {
    if (!N.w2s) return;
    var center = N.w2s(0, 0);
    var cx = center[0], cy = center[1];
    if (cx < -SAFE_RADIUS - 120 || cx > cam.w + SAFE_RADIUS + 120 || cy < -SAFE_RADIUS - 120 || cy > cam.h + SAFE_RADIUS + 120) return;
    var obj = objectiveFor(run);
    var portalReady = !!(obj && obj.unlocked);
    var t = (N.G && N.G.time) || (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);
    var accent = portalReady ? '#ffd23f' : '#8ef7c9';

    ctx.save();

    // Outer ward circle with subtle rune segments
    ctx.strokeStyle = portalReady ? 'rgba(255, 210, 63, 0.34)' : 'rgba(142, 247, 201, 0.16)';
    ctx.lineWidth = portalReady ? 2.4 : 1.6;
    ctx.setLineDash([16, 10]);
    ctx.lineDashOffset = -t * 8;
    ctx.beginPath();
    ctx.arc(cx, cy, SAFE_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // 8 boundary ward steles around SAFE_RADIUS
    for (var i = 0; i < 8; i++) {
      var a = (i / 8) * Math.PI * 2;
      var ox = cx + Math.cos(a) * SAFE_RADIUS;
      var oy = cy + Math.sin(a) * SAFE_RADIUS;
      drawExpShadow(ctx, ox, oy + 7, 11, 5, 0.65);
      // Stone stele body
      ctx.fillStyle = '#251a38';
      ctx.beginPath();
      ctx.moveTo(ox - 5.5, oy + 6);
      ctx.lineTo(ox - 4.2, oy - 9);
      ctx.lineTo(ox, oy - 13);
      ctx.lineTo(ox + 4.2, oy - 9);
      ctx.lineTo(ox + 5.5, oy + 6);
      ctx.closePath();
      ctx.fill();
      expStrokeInk(ctx, 1.4);
      // Lit face
      ctx.fillStyle = '#382952';
      ctx.beginPath();
      ctx.moveTo(ox - 4.2, oy - 9);
      ctx.lineTo(ox, oy - 13);
      ctx.lineTo(ox, oy + 6);
      ctx.lineTo(ox - 5.5, oy + 6);
      ctx.closePath();
      ctx.fill();
      // Glowing rune gem in stele
      var fl = 0.75 + 0.25 * Math.sin(t * 4 + i * 1.1);
      drawExpGlow(ctx, accent, ox, oy - 4, 12 * fl, portalReady ? 0.75 : 0.45);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(ox, oy - 4, 2.1, 0, Math.PI * 2);
      ctx.fill();
    }

    // Central Sanctuary Octagonal Dais at (0,0)
    drawExpShadow(ctx, cx, cy + 8, 72, 46, 0.75);
    drawExpGlow(ctx, accent, cx, cy, portalReady ? 95 : 68, portalReady ? 0.38 : 0.18);

    // Outer stone step (octagon)
    ctx.fillStyle = '#1b122b';
    ctx.beginPath();
    for (var k = 0; k < 8; k++) {
      var ka = (k / 8) * Math.PI * 2 + Math.PI / 8;
      var kx = cx + Math.cos(ka) * 58;
      var ky = cy + Math.sin(ka) * 44;
      if (k === 0) ctx.moveTo(kx, ky); else ctx.lineTo(kx, ky);
    }
    ctx.closePath();
    ctx.fill();
    expStrokeInk(ctx, 2);

    // Inner stone platform
    ctx.fillStyle = '#261a3b';
    ctx.beginPath();
    for (var k2 = 0; k2 < 8; k2++) {
      var ka2 = (k2 / 8) * Math.PI * 2 + Math.PI / 8;
      var kx2 = cx + Math.cos(ka2) * 44;
      var ky2 = cy + Math.sin(ka2) * 33;
      if (k2 === 0) ctx.moveTo(kx2, ky2); else ctx.lineTo(kx2, ky2);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = portalReady ? 'rgba(255, 210, 63, 0.55)' : 'rgba(142, 247, 201, 0.28)';
    ctx.lineWidth = 1.3;
    ctx.stroke();

    // 4 Corner Sanctuary Braziers
    var braziers = [[-38, -24], [38, -24], [-38, 24], [38, 24]];
    for (var bi = 0; bi < braziers.length; bi++) {
      var bx = cx + braziers[bi][0], by = cy + braziers[bi][1];
      drawExpShadow(ctx, bx, by + 5, 9, 4.5, 0.6);
      ctx.fillStyle = '#332449';
      ctx.beginPath();
      ctx.arc(bx, by, 6, 0, Math.PI * 2);
      ctx.fill();
      expStrokeInk(ctx, 1.3);
      var bFl = 0.8 + 0.22 * Math.sin(t * 7 + bi * 1.7);
      drawExpGlow(ctx, accent, bx, by - 3, 15 * bFl, 0.7);
      ctx.fillStyle = portalReady ? '#fff2b2' : '#d8ffe6';
      ctx.beginPath();
      ctx.arc(bx, by - 2.5, 2.6 * bFl, 0, Math.PI * 2);
      ctx.fill();
    }

    // Sanctuary Extraction Portal when 3 Seals are collected (or dormant sigil before)
    if (portalReady) {
      var pulse = 0.88 + 0.12 * Math.sin(t * 4.5);
      drawExpGlow(ctx, '#ffd23f', cx, cy, 66 * pulse, 0.65);
      drawExpGlow(ctx, '#8ef7c9', cx, cy, 40 * pulse, 0.55);

      ctx.fillStyle = 'rgba(20, 42, 38, 0.72)';
      ctx.beginPath();
      ctx.ellipse(cx, cy, 32 * pulse, 23 * pulse, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 34 * pulse, 25 * pulse, 0, 0, Math.PI * 2);
      ctx.stroke();

      ctx.strokeStyle = '#8ef7c9';
      ctx.lineWidth = 1.8;
      ctx.setLineDash([7, 5]);
      ctx.lineDashOffset = t * 24;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 22, 16, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Dormant seal slots (shows how many of the 3 seals are lit)
      var sealsDone = (obj && obj.seals) || 0;
      ctx.strokeStyle = 'rgba(142, 247, 201, 0.3)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(cx, cy, 22, 15, 0, 0, Math.PI * 2);
      ctx.stroke();
      for (var si = 0; si < 3; si++) {
        var sa = (si / 3) * Math.PI * 2 - Math.PI / 2;
        var sx0 = cx + Math.cos(sa) * 14;
        var sy0 = cy + Math.sin(sa) * 10;
        var lit = si < sealsDone;
        if (lit) drawExpGlow(ctx, '#ffd23f', sx0, sy0, 11, 0.75);
        ctx.fillStyle = lit ? '#ffd23f' : '#181026';
        ctx.beginPath();
        ctx.arc(sx0, sy0, 3.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = lit ? '#fff2b2' : '#584678';
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  function drawCitadelArena(ctx, run, cam) {
    var obj = objectiveFor(run);
    if (!obj || !obj.unlocked || !N.w2s) return;
    var cit = obj.citadel;
    var pos = N.w2s(cit.x, cit.y);
    var sx = pos[0], sy = pos[1];
    if (sx < -340 || sx > cam.w + 340 || sy < -340 || sy > cam.h + 340) return;

    var t = (N.G && N.G.time) || (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);
    var isCleared = cit.status === 'cleared';
    var isActive = cit.status === 'active';
    var col = isCleared ? '#8dff57' : '#ff4757';

    ctx.save();
    drawExpShadow(ctx, sx, sy + 12, 108, 76, 0.85);
    drawExpGlow(ctx, col, sx, sy, 115, isCleared ? 0.28 : 0.45);

    // Outer Obsidian Star Fortress Floor
    ctx.fillStyle = '#160b14';
    ctx.beginPath();
    for (var i = 0; i < 16; i++) {
      var a = (i / 16) * Math.PI * 2;
      var r = i % 2 === 0 ? 92 : 70;
      var px = sx + Math.cos(a) * r;
      var py = sy + Math.sin(a) * (r * 0.78);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    expStrokeInk(ctx, 2.4);

    // Inner ritual floor & sigil
    ctx.fillStyle = isCleared ? '#132117' : '#260e18';
    ctx.beginPath();
    ctx.ellipse(sx, sy, 62, 46, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = col;
    ctx.lineWidth = 2.2;
    ctx.stroke();

    // 8 Obsidian Dread Pillars around the arena
    for (var pi = 0; pi < 8; pi++) {
      var pa = (pi / 8) * Math.PI * 2;
      var prx = sx + Math.cos(pa) * 76;
      var pry = sy + Math.sin(pa) * 58;
      drawExpShadow(ctx, prx, pry + 6, 10, 5, 0.7);
      ctx.fillStyle = '#241529';
      ctx.fillRect(prx - 5, pry - 14, 10, 18);
      expStrokeInk(ctx, 1.4);
      ctx.fillStyle = '#3a2242';
      ctx.fillRect(prx - 5, pry - 14, 4, 18);
      var pfl = 0.75 + 0.25 * Math.sin(t * 6 + pi);
      drawExpGlow(ctx, col, prx, pry - 16, 14 * pfl, 0.75);
      ctx.fillStyle = isCleared ? '#c7ffb0' : '#ff9f43';
      ctx.beginPath();
      ctx.arc(prx, pry - 15, 2.8 * pfl, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bone & Obsidian Throne on the northern rim of the Citadel
    var tx = sx, ty = sy - 38;
    drawExpShadow(ctx, tx, ty + 14, 24, 10, 0.75);
    ctx.fillStyle = '#1f1326';
    ctx.beginPath();
    ctx.moveTo(tx - 16, ty + 10);
    ctx.lineTo(tx - 19, ty - 18);
    ctx.lineTo(tx - 9, ty - 12);
    ctx.lineTo(tx, ty - 26);
    ctx.lineTo(tx + 9, ty - 12);
    ctx.lineTo(tx + 19, ty - 18);
    ctx.lineTo(tx + 16, ty + 10);
    ctx.closePath();
    ctx.fill();
    expStrokeInk(ctx, 1.8);
    drawMiniSkull(ctx, tx, ty - 16, 1.15, col);

    if (isActive) {
      drawRunePerimeter(ctx, sx, sy, LEASH_RADIUS, '#ff4757', true, 0.4, t);
      // Sovereign of Ash live Boss Dread-Aura & Throne Tether
      if (cit.boss && !cit.boss.dead) {
        var bp = N.w2s(cit.boss.x, cit.boss.y);
        var bsx = bp[0], bsy = bp[1];
        // Nether tether from Obsidian Throne to the Sovereign
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 71, 87, 0.36)';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 6]);
        ctx.lineDashOffset = -t * 32;
        ctx.beginPath();
        ctx.moveTo(tx, ty - 8);
        ctx.quadraticCurveTo((tx + bsx) * 0.5, Math.min(ty, bsy) - 34, bsx, bsy);
        ctx.stroke();
        ctx.setLineDash([]);
        // Rotating crimson-gold dread sigil beneath the Boss
        drawExpGlow(ctx, '#ff4757', bsx, bsy, 54, 0.48);
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.ellipse(bsx, bsy + 4, 34, 22, 0, 0, Math.PI * 2);
        ctx.stroke();
        for (var bi = 0; bi < 4; bi++) {
          var ba = t * 2.8 + (bi * Math.PI) / 2;
          var ox = bsx + Math.cos(ba) * 34;
          var oy = bsy + 4 + Math.sin(ba) * 22;
          drawExpGlow(ctx, '#ffd23f', ox, oy, 10, 0.75);
          ctx.fillStyle = '#ffd23f';
          ctx.beginPath();
          ctx.arc(ox, oy, 2.6, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
    }
    ctx.restore();
  }

  function drawCorpseMoundsAndBanner(ctx, run, cam) {
    if (!N.w2s) return;
    var t = (N.G && N.G.time) || (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);
    var P = N.G && N.G.P;

    ctx.save();
    moundMap(run).forEach(function (m) {
      if (m.status !== 'available') return;
      var p = N.w2s(m.x, m.y);
      var sx = p[0], sy = p[1];
      if (sx < -120 || sx > cam.w + 120 || sy < -120 || sy > cam.h + 120) return;

      var near = P && Math.hypot(m.x - P.x, m.y - P.y) <= MOUND_INTERACT_RADIUS;
      var pulse = 0.82 + 0.18 * Math.sin(t * 4 + (m.x * 0.03));

      drawExpShadow(ctx, sx, sy + 6, 30, 15, 0.8);
      drawExpGlow(ctx, '#8ef7c9', sx, sy - 2, near ? 42 * pulse : 30 * pulse, near ? 0.55 : 0.32);

      // Interactive proximity ring when player can harvest [R]/[Q]
      if (near) {
        ctx.strokeStyle = 'rgba(142, 247, 201, 0.7)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([6, 4]);
        ctx.lineDashOffset = -t * 16;
        ctx.beginPath();
        ctx.ellipse(sx, sy + 2, 32, 19, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Dark disturbed grave earth base
      ctx.fillStyle = '#1b1326';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 4, 24, 12, 0, 0, Math.PI * 2);
      ctx.fill();
      expStrokeInk(ctx, 1.5);

      ctx.fillStyle = '#2b1f3a';
      ctx.beginPath();
      ctx.ellipse(sx - 2, sy + 2, 18, 8.5, 0, 0, Math.PI * 2);
      ctx.fill();

      // Crossed ribs & femurs sticking out of the mound
      ctx.strokeStyle = '#c9bfa4';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(sx - 15, sy + 6);
      ctx.lineTo(sx + 12, sy - 3);
      ctx.moveTo(sx - 10, sy - 4);
      ctx.lineTo(sx + 15, sy + 5);
      ctx.stroke();

      // Rusted greatsword planted at an angle in the cairn
      ctx.save();
      ctx.translate(sx + 4, sy - 6);
      ctx.rotate(0.22);
      ctx.fillStyle = '#736c7a';
      ctx.beginPath();
      ctx.moveTo(-2, 8);
      ctx.lineTo(-1.5, -16);
      ctx.lineTo(1.5, -16);
      ctx.lineTo(2, 8);
      ctx.closePath();
      ctx.fill();
      expStrokeInk(ctx, 1.1);
      // Crossguard & pommel
      ctx.strokeStyle = '#a38952';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-6, -10);
      ctx.lineTo(6, -10);
      ctx.stroke();
      ctx.restore();

      // Cluster of 3 skulls on the mound
      drawMiniSkull(ctx, sx - 8, sy + 1, 0.9, '#8ef7c9');
      drawMiniSkull(ctx, sx + 7, sy + 2, 0.85, '#ff6b7f');
      drawMiniSkull(ctx, sx - 1, sy - 3, 1.05, '#8ef7c9');

      // Rising soul wisps
      for (var wi = 0; wi < 2; wi++) {
        var wy = ((t * 18 + wi * 11) % 22);
        var wx = Math.sin(t * 3 + wi * 2.5) * 6 + (wi === 0 ? -5 : 5);
        var wa = Math.max(0, 1 - wy / 22);
        drawExpGlow(ctx, wi === 0 ? '#8ef7c9' : '#ff6b7f', sx + wx, sy - 6 - wy, 7, wa * 0.65);
        ctx.fillStyle = wi === 0 ? 'rgba(216,255,230,' + (wa * 0.8).toFixed(2) + ')' : 'rgba(255,180,190,' + (wa * 0.8).toFixed(2) + ')';
        ctx.beginPath();
        ctx.arc(sx + wx, sy - 6 - wy, 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    if (focusBanner) {
      var bp = N.w2s(focusBanner.x, focusBanner.y);
      var bx = bp[0], by = bp[1];
      var bannerRatio = Math.max(0, Math.min(1, focusBanner.left / (focusBanner.maxT || 10)));
      var wave = Math.sin(t * 7) * 3.5;

      drawExpShadow(ctx, bx, by + 10, 26, 12, 0.75);
      drawExpGlow(ctx, '#ffd23f', bx, by - 6, 48, 0.42);

      // Tactical command circle on ground
      ctx.fillStyle = 'rgba(255, 210, 63, 0.10)';
      ctx.beginPath();
      ctx.ellipse(bx, by + 6, 40, 24, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(255, 210, 63, 0.35)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.ellipse(bx, by + 6, 40, 24, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Remaining duration arc
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.ellipse(bx, by + 6, 40, 24, 0, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * bannerRatio);
      ctx.stroke();

      // War standard bone pole
      ctx.strokeStyle = '#d9cfb4';
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(bx, by + 10);
      ctx.lineTo(bx, by - 32);
      ctx.stroke();
      expStrokeInk(ctx, 1);

      // Fluttering tattered war pennant
      ctx.fillStyle = '#8f2436';
      ctx.beginPath();
      ctx.moveTo(bx + 1, by - 28);
      ctx.quadraticCurveTo(bx + 14, by - 26 + wave * 0.5, bx + 26, by - 21 + wave);
      ctx.lineTo(bx + 20, by - 15 + wave * 0.7);
      ctx.lineTo(bx + 25, by - 10 + wave);
      ctx.quadraticCurveTo(bx + 12, by - 11 + wave * 0.4, bx + 1, by - 12);
      ctx.closePath();
      ctx.fill();
      expStrokeInk(ctx, 1.3);

      // Gold trim & skull crest at top of pole
      ctx.strokeStyle = '#ffd23f';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(bx + 4, by - 20);
      ctx.lineTo(bx + 16, by - 18 + wave * 0.5);
      ctx.stroke();
      drawMiniSkull(ctx, bx, by - 34, 0.95, '#ffd23f');
    }
    ctx.restore();
  }

  function drawBrokenPillar(ctx, x, y, h, broken, accent, t, seedOff) {
    drawExpShadow(ctx, x, y + 5, 11, 5.5, 0.7);
    // Base plinth
    ctx.fillStyle = '#231934';
    ctx.fillRect(x - 8, y - 2, 16, 6);
    expStrokeInk(ctx, 1.3);
    // Column shaft
    ctx.fillStyle = '#312447';
    ctx.beginPath();
    ctx.moveTo(x - 6, y);
    ctx.lineTo(x - 6, y - h);
    if (broken) {
      ctx.lineTo(x - 1, y - h - 4);
      ctx.lineTo(x + 6, y - h + 3);
    } else {
      ctx.lineTo(x + 6, y - h);
    }
    ctx.lineTo(x + 6, y);
    ctx.closePath();
    ctx.fill();
    expStrokeInk(ctx, 1.4);

    // Shadow half of shaft
    ctx.fillStyle = '#1e152e';
    ctx.fillRect(x + 1, y - h + (broken ? 3 : 0), 5, h - (broken ? 3 : 0));

    if (!broken && accent) {
      var fl = 0.75 + 0.25 * Math.sin(t * 5 + (seedOff || 0));
      drawExpGlow(ctx, accent, x, y - h - 4, 13 * fl, 0.7);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(x, y - h - 3.5, 2.5 * fl, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPoiArchitecture(ctx, run, d, cam) {
    var pos = N.w2s(d.x, d.y);
    var sx = pos[0], sy = pos[1];
    if (sx < -260 || sx > cam.w + 260 || sy < -260 || sy > cam.h + 260) return;

    var enc = encounterView(run, d.id);
    var poi = poiView(run, d.id);
    var meta = getAreaMeta(run.seed, d.area.x, d.area.y);
    var isCleared = (poi && poi.status === 'cleared') || (enc && enc.status === 'cleared' && !poi);
    var isActive = enc && enc.status === 'active';
    var isRewardReady = poi && poi.status === 'reward-ready';
    var subType = effectivePoiType(run, d) || meta.poiSubType || 'ruins';
    var t = (N.G && N.G.time) || (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);

    var color = isCleared ? '#8dff57' : isRewardReady ? '#ffd23f' : isActive ? '#ff4757' :
      subType === 'altar' ? '#ff5e6c' : subType === 'crypt' ? '#8ef7c9' :
      subType === 'ossuary' ? '#b657ff' : '#d9b35f';

    var P = N.G && N.G.P;
    var distToPlayer = P ? Math.hypot(d.x - P.x, d.y - P.y) : 999;
    var proxAlpha = Math.max(0.08, Math.min(0.32, (1 - Math.min(1, (distToPlayer - ACTIVATION_RADIUS) / 380)) * 0.32));

    ctx.save();

    // Soft rune perimeter instead of harsh CAD dashed circles
    if (!isCleared) {
      drawRunePerimeter(ctx, sx, sy, ACTIVATION_RADIUS, isActive ? '#ff4757' : color, isActive, proxAlpha, t);
      if (isActive) {
        ctx.strokeStyle = 'rgba(255, 71, 87, 0.16)';
        ctx.lineWidth = 1.4;
        ctx.setLineDash([12, 10]);
        ctx.beginPath();
        ctx.arc(sx, sy, LEASH_RADIUS, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    // Ground shadow & ambient magical aura under the landmark
    drawExpShadow(ctx, sx, sy + 10, 68, 44, 0.82);
    drawExpGlow(ctx, color, sx, sy - 4, isRewardReady ? 78 : isActive ? 72 : 56, isCleared ? 0.22 : isRewardReady ? 0.62 : 0.35);

    if (subType === 'ruins') {
      // Cracked ancient stone courtyard slab
      ctx.fillStyle = '#1b1328';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 4, 56, 36, 0, 0, Math.PI * 2);
      ctx.fill();
      expStrokeInk(ctx, 2);

      ctx.fillStyle = '#261b38';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 2, 44, 28, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.globalAlpha = isCleared ? 0.4 : 0.72;
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Floor cracks
      ctx.strokeStyle = 'rgba(8, 5, 14, 0.75)';
      ctx.lineWidth = 1.3;
      ctx.beginPath();
      ctx.moveTo(sx - 34, sy + 4);
      ctx.lineTo(sx - 14, sy + 9);
      ctx.lineTo(sx - 6, sy + 2);
      ctx.moveTo(sx + 18, sy - 10);
      ctx.lineTo(sx + 32, sy - 4);
      ctx.stroke();

      // Back columns
      drawBrokenPillar(ctx, sx - 32, sy - 14, 24, false, color, t, 0);
      drawBrokenPillar(ctx, sx + 32, sy - 14, 16, true, color, t, 1.5);

      // Central Pedestal & Floating Relic Seal
      drawExpShadow(ctx, sx, sy + 6, 18, 9, 0.7);
      ctx.fillStyle = '#2d2142';
      ctx.beginPath();
      ctx.moveTo(sx - 13, sy + 6);
      ctx.lineTo(sx - 10, sy - 10);
      ctx.lineTo(sx + 10, sy - 10);
      ctx.lineTo(sx + 13, sy + 6);
      ctx.closePath();
      ctx.fill();
      expStrokeInk(ctx, 1.6);

      var floatY = sy - 20 + Math.sin(t * 3.2) * 3;
      drawExpGlow(ctx, color, sx, floatY, isRewardReady ? 26 : 18, isCleared ? 0.35 : 0.85);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(sx, floatY - 8);
      ctx.lineTo(sx + 6.5, floatY);
      ctx.lineTo(sx, floatY + 8);
      ctx.lineTo(sx - 6.5, floatY);
      ctx.closePath();
      ctx.fill();
      expStrokeInk(ctx, 1.2);

      // Front columns (one broken with fallen drum)
      drawBrokenPillar(ctx, sx - 30, sy + 18, 13, true, color, t, 2.8);
      drawBrokenPillar(ctx, sx + 30, sy + 18, 22, false, color, t, 4.1);
    } else if (subType === 'altar') {
      // Blood Ziggurat Altar
      ctx.fillStyle = '#241019';
      ctx.beginPath();
      for (var k = 0; k < 6; k++) {
        var ang = (k / 6) * Math.PI * 2 - Math.PI / 6;
        var rx = sx + Math.cos(ang) * 52;
        var ry = sy + Math.sin(ang) * 35;
        if (k === 0) ctx.moveTo(rx, ry); else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.fill();
      expStrokeInk(ctx, 2);

      // Second tier & blood hexagram
      ctx.fillStyle = '#361523';
      ctx.beginPath();
      for (var k2 = 0; k2 < 6; k2++) {
        var ang2 = (k2 / 6) * Math.PI * 2 - Math.PI / 6;
        var rx2 = sx + Math.cos(ang2) * 38;
        var ry2 = sy + Math.sin(ang2) * 25;
        if (k2 === 0) ctx.moveTo(rx2, ry2); else ctx.lineTo(rx2, ry2);
      }
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.stroke();

      // Side horned spikes
      var horns = [-34, 34];
      for (var hi = 0; hi < 2; hi++) {
        var hx = sx + horns[hi], hy = sy + 2;
        ctx.fillStyle = '#d9cfb4';
        ctx.beginPath();
        ctx.moveTo(hx - 4, hy + 4);
        ctx.quadraticCurveTo(hx + (hi === 0 ? -8 : 8), hy - 14, hx + (hi === 0 ? 3 : -3), hy - 20);
        ctx.quadraticCurveTo(hx + (hi === 0 ? -2 : 2), hy - 8, hx + 4, hy + 4);
        ctx.closePath();
        ctx.fill();
        expStrokeInk(ctx, 1.3);
      }

      // Sacrificial Chalice / Blood Basin in center
      drawExpShadow(ctx, sx, sy + 6, 18, 9, 0.75);
      ctx.fillStyle = '#2a1824';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 4, 17, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      expStrokeInk(ctx, 1.7);

      ctx.fillStyle = isCleared ? '#43b581' : '#c92a42';
      ctx.beginPath();
      ctx.ellipse(sx, sy - 4, 13, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      drawExpGlow(ctx, color, sx, sy - 6, 24, 0.8);
    } else if (subType === 'crypt') {
      // Ancestral Gothic Crypt Mausoleum
      ctx.fillStyle = '#171d26';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 6, 54, 34, 0, 0, Math.PI * 2);
      ctx.fill();
      expStrokeInk(ctx, 1.8);

      // Crypt stone steps at front
      ctx.fillStyle = '#283140';
      ctx.fillRect(sx - 22, sy + 10, 44, 12);
      expStrokeInk(ctx, 1.3);
      ctx.fillStyle = '#344052';
      ctx.fillRect(sx - 18, sy + 14, 36, 8);

      // Mausoleum walls & pitched roof
      ctx.fillStyle = '#26303d';
      ctx.beginPath();
      ctx.moveTo(sx - 28, sy + 10);
      ctx.lineTo(sx - 28, sy - 16);
      ctx.lineTo(sx, sy - 34);
      ctx.lineTo(sx + 28, sy - 16);
      ctx.lineTo(sx + 28, sy + 10);
      ctx.closePath();
      ctx.fill();
      expStrokeInk(ctx, 2);

      // Roof cornice highlight
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(sx - 31, sy - 15);
      ctx.lineTo(sx, sy - 35);
      ctx.lineTo(sx + 31, sy - 15);
      ctx.stroke();

      // Dark arched doorway with glowing eyes/runes inside
      ctx.fillStyle = '#090d14';
      ctx.beginPath();
      ctx.arc(sx, sy - 4, 12, Math.PI, 0, false);
      ctx.lineTo(sx + 12, sy + 10);
      ctx.lineTo(sx - 12, sy + 10);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Iron portcullis bars
      ctx.strokeStyle = '#4f5d73';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(sx - 5, sy - 14); ctx.lineTo(sx - 5, sy + 10);
      ctx.moveTo(sx + 5, sy - 14); ctx.lineTo(sx + 5, sy + 10);
      ctx.stroke();

      drawExpGlow(ctx, color, sx, sy, 18, 0.75);
      drawMiniSkull(ctx, sx, sy - 22, 1.0, color);
    } else if (subType === 'camp') {
      // Fortified Guard Outpost (Сторожевой Пост): spiked palisade, watch-fire brazier & skull pikes
      ctx.fillStyle = '#1f1621';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 5, 50, 32, 0, 0, Math.PI * 2);
      ctx.fill();
      expStrokeInk(ctx, 1.8);

      // Angled wooden/bone palisade stakes around perimeter
      var stakes = [[-36, -10, -0.25], [36, -10, 0.25], [-28, 16, -0.18], [28, 16, 0.18]];
      for (var si = 0; si < stakes.length; si++) {
        var st = stakes[si];
        ctx.save();
        ctx.translate(sx + st[0], sy + st[1]);
        ctx.rotate(st[2]);
        ctx.fillStyle = '#5c4632';
        ctx.beginPath();
        ctx.moveTo(-3.5, 8);
        ctx.lineTo(-2.5, -12);
        ctx.lineTo(0, -18);
        ctx.lineTo(2.5, -12);
        ctx.lineTo(3.5, 8);
        ctx.closePath();
        ctx.fill();
        expStrokeInk(ctx, 1.3);
        ctx.restore();
      }

      // Central iron watch-brazier with flickering campfire
      drawExpShadow(ctx, sx, sy + 7, 16, 8, 0.75);
      ctx.fillStyle = '#2b2430';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 2, 14, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      expStrokeInk(ctx, 1.6);

      var fireFl = 0.8 + 0.25 * Math.sin(t * 9);
      drawExpGlow(ctx, isCleared ? '#8dff57' : '#ff9f43', sx, sy - 6, 26 * fireFl, 0.8);
      ctx.fillStyle = isCleared ? '#8dff57' : '#ff9f43';
      ctx.beginPath();
      ctx.moveTo(sx - 7, sy + 1);
      ctx.quadraticCurveTo(sx - 4, sy - 14 * fireFl, sx, sy - 18 * fireFl);
      ctx.quadraticCurveTo(sx + 4, sy - 14 * fireFl, sx + 7, sy + 1);
      ctx.closePath();
      ctx.fill();

      // Trophy skull on a tall pike behind the fire
      ctx.strokeStyle = '#6b533b';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(sx + 14, sy + 6);
      ctx.lineTo(sx + 16, sy - 24);
      ctx.stroke();
      drawMiniSkull(ctx, sx + 16, sy - 25, 0.95, color);
    } else {
      // Ossuary Bone Spire
      ctx.fillStyle = '#1c1229';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 5, 52, 33, 0, 0, Math.PI * 2);
      ctx.fill();
      expStrokeInk(ctx, 1.8);

      // Giant curved bone ribs arching from the ground
      for (var ri = -1; ri <= 1; ri += 2) {
        ctx.strokeStyle = '#d9cfb4';
        ctx.lineWidth = 3.5;
        ctx.beginPath();
        ctx.moveTo(sx + ri * 38, sy + 10);
        ctx.quadraticCurveTo(sx + ri * 44, sy - 18, sx + ri * 14, sy - 26);
        ctx.stroke();
        expStrokeInk(ctx, 1);

        ctx.strokeStyle = '#b3a686';
        ctx.lineWidth = 2.8;
        ctx.beginPath();
        ctx.moveTo(sx + ri * 28, sy + 18);
        ctx.quadraticCurveTo(sx + ri * 32, sy - 6, sx + ri * 10, sy - 14);
        ctx.stroke();
      }

      // Central necrotic bone obelisk
      ctx.fillStyle = '#cfc4a6';
      ctx.beginPath();
      ctx.moveTo(sx - 9, sy + 8);
      ctx.lineTo(sx - 5, sy - 28);
      ctx.lineTo(sx, sy - 36);
      ctx.lineTo(sx + 5, sy - 28);
      ctx.lineTo(sx + 9, sy + 8);
      ctx.closePath();
      ctx.fill();
      expStrokeInk(ctx, 1.6);

      drawExpGlow(ctx, color, sx, sy - 18, 26, 0.82);
      drawMiniSkull(ctx, sx, sy - 18, 1.1, color);
      drawMiniSkull(ctx, sx - 12, sy + 5, 0.85, color);
      drawMiniSkull(ctx, sx + 12, sy + 5, 0.85, color);
    }

    ctx.restore();
  }

  function drawSectorAnomalies(ctx, run, cam) {
    if (!N.w2s) return;
    var t = (N.G && N.G.time) || (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);
    var P = N.G && N.G.P;

    ctx.save();
    anomalyMap(run).forEach(function (a) {
      if (a.status !== 'available') return;
      var p = N.w2s(a.x, a.y);
      var sx = p[0], sy = p[1];
      if (sx < -140 || sx > cam.w + 140 || sy < -140 || sy > cam.h + 140) return;

      var col = a.col || '#8ef7c9';
      var near = P && Math.hypot(a.x - P.x, a.y - P.y) <= ANOMALY_INTERACT_RADIUS;
      var hover = Math.sin(t * 3.5 + (a.x * 0.02)) * 2.5;

      drawExpShadow(ctx, sx, sy + 8, 30, 16, 0.8);
      drawExpGlow(ctx, col, sx, sy - 8, near ? 52 : 38, near ? 0.65 : 0.42);

      // Base ritual stone pad
      ctx.fillStyle = '#171024';
      ctx.beginPath();
      ctx.ellipse(sx, sy + 5, 27, 15, 0, 0, Math.PI * 2);
      ctx.fill();
      expStrokeInk(ctx, 1.6);

      ctx.strokeStyle = col;
      ctx.globalAlpha = near ? 0.85 : 0.45;
      ctx.lineWidth = near ? 1.8 : 1.2;
      ctx.beginPath();
      ctx.ellipse(sx, sy + 5, 22, 11.5, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;

      if (a.kind === 'obelisk') {
        // Obsidian Seer Obelisk with levitating pyramidion tip
        ctx.fillStyle = '#241b38';
        ctx.beginPath();
        ctx.moveTo(sx - 8, sy + 5);
        ctx.lineTo(sx - 5.5, sy - 18);
        ctx.lineTo(sx + 5.5, sy - 18);
        ctx.lineTo(sx + 8, sy + 5);
        ctx.closePath();
        ctx.fill();
        expStrokeInk(ctx, 1.6);

        // Lit left facet
        ctx.fillStyle = '#352852';
        ctx.beginPath();
        ctx.moveTo(sx - 8, sy + 5);
        ctx.lineTo(sx - 5.5, sy - 18);
        ctx.lineTo(sx, sy - 18);
        ctx.lineTo(sx, sy + 5);
        ctx.closePath();
        ctx.fill();

        // Levitating crystal capstone
        var tipY = sy - 23 + hover;
        drawExpGlow(ctx, col, sx, tipY - 4, 18, 0.85);
        ctx.fillStyle = col;
        ctx.beginPath();
        ctx.moveTo(sx, tipY - 11);
        ctx.lineTo(sx + 6.5, tipY);
        ctx.lineTo(sx, tipY + 3);
        ctx.lineTo(sx - 6.5, tipY);
        ctx.closePath();
        ctx.fill();
        expStrokeInk(ctx, 1.2);

        // Glowing glyph line down the shaft
        ctx.strokeStyle = col;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(sx, sy - 14);
        ctx.lineTo(sx, sy + 1);
        ctx.stroke();
      } else if (a.kind === 'soul_well') {
        // Ancient Stone Well of Souls with swirling vortex & rising spirits
        ctx.fillStyle = '#2b203d';
        ctx.beginPath();
        ctx.ellipse(sx, sy + 2, 19, 10.5, 0, 0, Math.PI * 2);
        ctx.fill();
        expStrokeInk(ctx, 1.6);

        ctx.fillStyle = '#382a4f';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 2, 19, 9.5, 0, 0, Math.PI * 2);
        ctx.fill();
        expStrokeInk(ctx, 1.5);

        // Glowing soul pool inside well
        ctx.fillStyle = '#120824';
        ctx.beginPath();
        ctx.ellipse(sx, sy - 2, 14, 6.5, 0, 0, Math.PI * 2);
        ctx.fill();

        drawExpGlow(ctx, col, sx, sy - 3, 24, 0.85);
        ctx.fillStyle = col;
        ctx.globalAlpha = 0.72;
        ctx.beginPath();
        ctx.ellipse(sx, sy - 2, 11, 4.8, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Rising soul bubbles
        for (var bi = 0; bi < 3; bi++) {
          var by = ((t * 16 + bi * 8) % 24);
          var bx = sx + Math.sin(t * 4 + bi * 2) * 5;
          var ba = Math.max(0, 1 - by / 24);
          ctx.fillStyle = '#e8d4ff';
          ctx.globalAlpha = ba * 0.85;
          ctx.beginPath();
          ctx.arc(bx, sy - 5 - by, 2.1, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else {
        // Cursed Blood Shrine: spiked dark idol with burning crimson eye
        ctx.fillStyle = '#2e1521';
        ctx.beginPath();
        ctx.moveTo(sx - 10, sy + 5);
        ctx.lineTo(sx - 13, sy - 10);
        ctx.lineTo(sx - 6, sy - 22);
        ctx.lineTo(sx, sy - 16);
        ctx.lineTo(sx + 6, sy - 22);
        ctx.lineTo(sx + 13, sy - 10);
        ctx.lineTo(sx + 10, sy + 5);
        ctx.closePath();
        ctx.fill();
        expStrokeInk(ctx, 1.7);

        drawExpGlow(ctx, col, sx, sy - 10, 22, 0.85);
        drawMiniSkull(ctx, sx, sy - 11 + hover * 0.4, 1.15, col);
      }
    });
    ctx.restore();
  }

  function drawWorld(ctx) {
    var run = ensureRun();
    if (!run || !N.w2s) return;
    var cam = N.cam ? N.cam() : { w: ctx.canvas.width, h: ctx.canvas.height };
    ctx.save();

    drawSanctumRing(ctx, run, cam);
    drawCitadelArena(ctx, run, cam);
    drawCorpseMoundsAndBanner(ctx, run, cam);
    drawSectorAnomalies(ctx, run, cam);
    drawGrimoireBursts(ctx, cam);

    var visible = run.snapshot();
    for (var di = 0; di < visible.length; di++) {
      drawPoiArchitecture(ctx, run, visible[di], cam);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '700 20px Rubik, sans-serif';
    var player = N.G && N.G.P;
    if (player) visible.sort(function (a, b) {
      var adx = a.x - player.x, ady = a.y - player.y;
      var bdx = b.x - player.x, bdy = b.y - player.y;
      return adx * adx + ady * ady - (bdx * bdx + bdy * bdy);
    });
    var ruinsTarget = null;
    for (var vi = 0; vi < visible.length; vi++) {
      if (visible[vi].poiType !== 'ruins') continue;
      var rv = poiView(run, visible[vi].id);
      var rdx = player ? visible[vi].x - player.x : 0;
      var rdy = player ? visible[vi].y - player.y : 0;
      var nearby = !player || rdx * rdx + rdy * rdy <= RUINS_CUE_RADIUS * RUINS_CUE_RADIUS;
      var rp = N.w2s(visible[vi].x, visible[vi].y);
      var ruinsOnScreen = rp[0] >= 24 && rp[0] <= cam.w - 24 && rp[1] >= 24 && rp[1] <= cam.h - 24;
      if (rv && ((rv.status !== 'cleared' && nearby) || (rv.status === 'cleared' && ruinsOnScreen))) ruinsTarget = visible[vi];
      break;
    }
    var target = ruinsTarget;
    if (!target) {
      for (var gi = 0; gi < visible.length; gi++) if (visible[gi].poiType !== 'ruins') { target = visible[gi]; break; }
    }
    if (target) {
      var p = N.w2s(target.x, target.y);
      var margin = 24;
      var onScreen = p[0] >= margin && p[0] <= cam.w - margin && p[1] >= margin && p[1] <= cam.h - margin;
      var sx = Math.max(margin, Math.min(cam.w - margin, p[0]));
      var sy = Math.max(margin, Math.min(cam.h - margin, p[1]));
      var encounter = encounterView(run, target.id);
      var poi = target.poiType === 'ruins' ? poiView(run, target.id) : null;
      if (!(poi && poi.status === 'cleared' && !onScreen)) {
        var mark = poi ? (poi.status === 'cleared' ? '✓' : poi.status === 'reward-ready' ? '★' : encounter && encounter.status === 'active' ? '✦' : '⌂') :
          encounter && encounter.status === 'cleared' ? '✓' : encounter && encounter.status === 'active' ? '✦' : '◆';
        var markCol = poi && poi.status === 'cleared' ? '#8dff57' : poi && poi.status === 'reward-ready' ? '#ffd23f' : encounter && encounter.status === 'active' ? '#ff4757' : '#d9b35f';
        // Subtle dark medallion behind off-screen / on-screen marker for crisp contrast
        if (!onScreen) {
          drawExpGlow(ctx, markCol, sx, sy, 20, 0.55);
          ctx.fillStyle = 'rgba(12, 8, 20, 0.88)';
          ctx.beginPath();
          ctx.arc(sx, sy, 14, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = markCol;
          ctx.lineWidth = 1.5;
          ctx.stroke();
        }
        ctx.globalAlpha = .95;
        ctx.fillStyle = markCol;
        ctx.fillText(mark, sx, sy);
        if (poi && onScreen) {
          ctx.globalAlpha = .85;
          ctx.font = '700 10px Rubik, sans-serif';
          ctx.fillText(poi.status === 'cleared' ? 'РУИНЫ · ЗАЧИЩЕНО' : 'РУИНЫ', sx, sy + 32);
          ctx.font = '700 20px Rubik, sans-serif';
        }
      }
    }
    ctx.globalAlpha = .55;
    ctx.textAlign = 'left';
    ctx.font = '600 10px Rubik, sans-serif';
    ctx.fillStyle = '#d9d2bd';
    ctx.fillText('SEED ' + run.seed, 12, Math.max(14, cam.h - 14));
    ctx.restore();
  }

  function drawGrimoireBursts(ctx, cam) {
    if (!visualBursts.length || !N.w2s) return;
    var t = (N.G && N.G.time) || (typeof performance !== 'undefined' ? performance.now() / 1000 : 0);
    ctx.save();
    for (var i = 0; i < visualBursts.length; i++) {
      var b = visualBursts[i];
      var p = N.w2s(b.x, b.y);
      var sx = p[0], sy = p[1];
      if (sx < -320 || sx > cam.w + 320 || sy < -320 || sy > cam.h + 320) continue;
      var u = Math.max(0, Math.min(1, 1 - Math.max(0, b.left / (b.maxT || 0.5))));
      var fade = Math.max(0, 1 - u);
      var easeOut = 1 - Math.pow(1 - u, 2.2);
      var r = Math.max(8, b.maxR * easeOut);
      var col = b.col || '#8ef7c9';
      var kind = b.kind || 'generic';

      ctx.save();
      drawExpGlow(ctx, col, sx, sy, r * 1.18, fade * 0.58);

      if (kind === 'bastion') {
        // [1] BONE BASTION: Octagonal runic dome + 8 orbiting gothic bone tower-shields + rising heal crosses
        ctx.globalAlpha = fade * 0.26;
        ctx.fillStyle = '#8ef7c9';
        ctx.beginPath();
        for (var k = 0; k < 8; k++) {
          var ka = (k / 8) * Math.PI * 2 + u * 0.6;
          var kx = sx + Math.cos(ka) * (r * 0.88);
          var ky = sy + Math.sin(ka) * (r * 0.68);
          if (k === 0) ctx.moveTo(kx, ky); else ctx.lineTo(kx, ky);
        }
        ctx.closePath();
        ctx.fill();

        ctx.globalAlpha = fade * 0.88;
        ctx.strokeStyle = '#8ef7c9';
        ctx.lineWidth = 2.6;
        ctx.stroke();

        // Inner golden ward ring
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.ellipse(sx, sy, r * 0.62, r * 0.48, -u * 1.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);

        // 8 Orbiting Bone Tower-Shields locking into phalanx formation
        var shieldR = r * 0.78;
        for (var si = 0; si < 8; si++) {
          var sa = (si / 8) * Math.PI * 2 + u * 1.8;
          var shx = sx + Math.cos(sa) * shieldR;
          var shy = sy + Math.sin(sa) * (shieldR * 0.76);
          ctx.save();
          ctx.translate(shx, shy);
          ctx.globalAlpha = fade * 0.95;
          ctx.fillStyle = '#e3d8bd';
          ctx.beginPath();
          ctx.moveTo(-5, -7);
          ctx.lineTo(5, -7);
          ctx.lineTo(6, 1);
          ctx.lineTo(0, 8);
          ctx.lineTo(-6, 1);
          ctx.closePath();
          ctx.fill();
          expStrokeInk(ctx, 1.3);
          ctx.fillStyle = '#a3946f';
          ctx.fillRect(-1.2, -5.5, 2.4, 11);
          ctx.fillStyle = '#ffd23f';
          ctx.beginPath();
          ctx.arc(0, 0, 2, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }

        // Ascending emerald heal-sparks (+)
        ctx.strokeStyle = '#d8ffe6';
        ctx.lineWidth = 1.8;
        for (var hi = 0; hi < 6; hi++) {
          var ha = (hi / 6) * Math.PI * 2 + 0.4;
          var hx = sx + Math.cos(ha) * (r * 0.42);
          var hy = sy + Math.sin(ha) * (r * 0.3) - u * 34;
          ctx.globalAlpha = fade * 0.9;
          ctx.beginPath();
          ctx.moveTo(hx - 3.5, hy); ctx.lineTo(hx + 3.5, hy);
          ctx.moveTo(hx, hy - 3.5); ctx.lineTo(hx, hy + 3.5);
          ctx.stroke();
        }
      } else if (kind === 'detonate') {
        // [2] CORPSE-ASH DETONATION: Radial scorch fissures + double blast wave + flying bone shards + central skull shockwave
        ctx.globalAlpha = fade * 0.85;
        ctx.strokeStyle = '#ff4757';
        ctx.lineWidth = 3.2;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.66, 0, Math.PI * 2);
        ctx.stroke();

        // 10 Jagged ground scorch fissures radiating from epicenter
        ctx.strokeStyle = '#ff9f43';
        ctx.lineWidth = 2;
        for (var fi = 0; fi < 10; fi++) {
          var fa = (fi / 10) * Math.PI * 2 + (fi % 2) * 0.14;
          var fLen = r * (0.72 + (fi % 3) * 0.12);
          var mx = sx + Math.cos(fa + 0.09) * (fLen * 0.52);
          var my = sy + Math.sin(fa + 0.09) * (fLen * 0.52);
          var ex = sx + Math.cos(fa) * fLen;
          var ey = sy + Math.sin(fa) * fLen;
          ctx.globalAlpha = fade * 0.78;
          ctx.beginPath();
          ctx.moveTo(sx + Math.cos(fa) * 10, sy + Math.sin(fa) * 10);
          ctx.lineTo(mx, my);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }

        // 14 Flying bone splinters & crimson ash cinders
        for (var bi = 0; bi < 14; bi++) {
          var ba = (bi / 14) * Math.PI * 2 + 0.23;
          var bd = r * (0.35 + ((bi * 7) % 5) * 0.16);
          var bx = sx + Math.cos(ba) * bd;
          var by = sy + Math.sin(ba) * bd - Math.sin(u * Math.PI) * 14;
          ctx.save();
          ctx.translate(bx, by);
          ctx.rotate(ba + u * 5);
          ctx.globalAlpha = fade * 0.92;
          ctx.fillStyle = bi % 2 === 0 ? '#e8dfcf' : '#ff6b7f';
          ctx.fillRect(-4.5, -1.6, 9, 3.2);
          expStrokeInk(ctx, 1);
          ctx.restore();
        }

        // Central expanding necrotic skull silhouette
        if (u < 0.75) {
          ctx.globalAlpha = (1 - u / 0.75) * 0.85;
          drawMiniSkull(ctx, sx, sy - u * 18, 1.35 + u * 1.1, '#ff4757');
        }
      } else if (kind === 'dreadknight') {
        // [3] CRYPT GUARDIAN SUMMON: Abyssal pentagram + sky-to-ground lightning pillar + erupting chains
        drawRunePerimeter(ctx, sx, sy, r * 0.82, '#b657ff', true, fade * 0.9, t * 3);

        // Sky-to-ground necromantic lightning bolt (strongest in first 65% of cast)
        if (u < 0.75) {
          var boltFade = 1 - u / 0.75;
          drawExpGlow(ctx, '#b657ff', sx, sy - 70, 68, boltFade * 0.65);
          ctx.globalAlpha = boltFade * 0.95;
          ctx.strokeStyle = '#f3d9ff';
          ctx.lineWidth = 4.5 * boltFade;
          ctx.beginPath();
          ctx.moveTo(sx - 8, sy - 210);
          ctx.lineTo(sx + 11, sy - 145);
          ctx.lineTo(sx - 9, sy - 92);
          ctx.lineTo(sx + 7, sy - 42);
          ctx.lineTo(sx, sy);
          ctx.stroke();

          ctx.strokeStyle = '#b657ff';
          ctx.lineWidth = 9 * boltFade;
          ctx.globalAlpha = boltFade * 0.4;
          ctx.stroke();
        }

        // 6 Erupting obsidian chains around the summoned Dreadknight
        ctx.strokeStyle = '#d8b4fe';
        ctx.lineWidth = 2.2;
        for (var ci = 0; ci < 6; ci++) {
          var ca = (ci / 6) * Math.PI * 2 + u * 0.8;
          var cx1 = sx + Math.cos(ca) * 14;
          var cy1 = sy + Math.sin(ca) * 10;
          var cx2 = sx + Math.cos(ca) * (r * 0.78);
          var cy2 = sy + Math.sin(ca) * (r * 0.56) - (1 - u) * 26;
          ctx.globalAlpha = fade * 0.85;
          ctx.beginPath();
          ctx.moveTo(cx1, cy1);
          ctx.lineTo(cx2, cy2);
          ctx.stroke();
        }
      } else if (kind === 'rift_out' || kind === 'rift_in') {
        // [4] PHASE RIFT: Dimensional star-slash tear + warp lightning threads connecting origin & destination
        var starR = kind === 'rift_out' ? b.maxR * (1 - u * 0.65) : r;
        ctx.globalAlpha = fade * 0.92;
        ctx.fillStyle = kind === 'rift_out' ? '#241438' : '#fff2b2';
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        for (var pi = 0; pi < 8; pi++) {
          var pa = (pi / 8) * Math.PI * 2 + u * (kind === 'rift_out' ? -2.4 : 2.4);
          var pr = pi % 2 === 0 ? starR * 0.92 : starR * 0.26;
          var px = sx + Math.cos(pa) * pr;
          var py = sy + Math.sin(pa) * (pr * 0.78);
          if (pi === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // Warp trail threads between departure and arrival
        if (kind === 'rift_in' && b.ox != null && b.oy != null) {
          var op = N.w2s(b.ox, b.oy);
          ctx.strokeStyle = '#ffd23f';
          ctx.lineWidth = 2 * fade;
          ctx.setLineDash([10, 8]);
          ctx.beginPath();
          ctx.moveTo(op[0], op[1]);
          ctx.lineTo(sx, sy);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      } else if (kind === 'mound_raise') {
        // [R] CORPSE MOUND RAISE: Emerald resurrection pillar + rising skeletal blades
        ctx.globalAlpha = fade * 0.38;
        ctx.fillStyle = '#8ef7c9';
        ctx.fillRect(sx - 18 * fade, sy - 135 * easeOut, 36 * fade, 135 * easeOut);

        ctx.globalAlpha = fade * 0.88;
        ctx.strokeStyle = '#8ef7c9';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.ellipse(sx, sy, r * 0.85, r * 0.58, 0, 0, Math.PI * 2);
        ctx.stroke();

        for (var ri = 0; ri < 5; ri++) {
          var ra = (ri / 5) * Math.PI * 2 + u * 1.3;
          var rx = sx + Math.cos(ra) * (r * 0.52);
          var ry = sy + Math.sin(ra) * (r * 0.35) - u * 32;
          ctx.fillStyle = '#e8dfcf';
          ctx.beginPath();
          ctx.arc(rx, ry, 3.2, 0, Math.PI * 2);
          ctx.fill();
          expStrokeInk(ctx, 1);
        }
      } else if (kind === 'mound_siphon') {
        // [Q] CORPSE MOUND SIPHON: Curved crimson blood-soul tethers flowing into the Necromancer
        var targetX = sx, targetY = sy;
        if (N.G && N.G.P) {
          var tp = N.w2s(N.G.P.x, N.G.P.y);
          targetX = tp[0];
          targetY = tp[1];
        }
        ctx.globalAlpha = fade * 0.85;
        ctx.strokeStyle = '#ff6b7f';
        ctx.lineWidth = 2.2;
        for (var si2 = 0; si2 < 5; si2++) {
          var spread = (si2 - 2) * 18;
          var cpx = (sx + targetX) * 0.5 - spread;
          var cpy = Math.min(sy, targetY) - 28 - Math.abs(spread);
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(cpx, cpy, targetX, targetY);
          ctx.stroke();
          // Traveling blood soul orb along curve
          var tOrb = Math.min(1, (u * 1.25 + si2 * 0.12) % 1);
          var invT = 1 - tOrb;
          var ox2 = invT * invT * sx + 2 * invT * tOrb * cpx + tOrb * tOrb * targetX;
          var oy2 = invT * invT * sy + 2 * invT * tOrb * cpy + tOrb * tOrb * targetY;
          drawExpGlow(ctx, '#ff4757', ox2, oy2, 10, fade * 0.75);
          ctx.fillStyle = '#ffd23f';
          ctx.beginPath();
          ctx.arc(ox2, oy2, 2.8, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (kind === 'banner_drop') {
        // [F] FOCUS BANNER DROP: Falling war-standard + golden tactical command chevrons
        var dropY = sy - Math.max(0, 1 - u * 3.2) * 120;
        if (u < 0.35) {
          ctx.globalAlpha = (1 - u / 0.35) * 0.85;
          ctx.strokeStyle = '#ffd23f';
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.moveTo(sx, dropY - 45);
          ctx.lineTo(sx, dropY);
          ctx.stroke();
        }
        ctx.globalAlpha = fade * 0.85;
        ctx.strokeStyle = '#ffd23f';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(sx, sy, r * 0.86, r * 0.62, 0, 0, Math.PI * 2);
        ctx.stroke();
        // 4 Inward tactical chevrons
        for (var chi = 0; chi < 4; chi++) {
          var cha = (chi / 4) * Math.PI * 2 + Math.PI / 4;
          var chd = r * (0.95 - u * 0.35);
          var chx = sx + Math.cos(cha) * chd;
          var chy = sy + Math.sin(cha) * (chd * 0.72);
          ctx.beginPath();
          ctx.arc(chx, chy, 3, 0, Math.PI * 2);
          ctx.fillStyle = '#ffd23f';
          ctx.fill();
        }
      } else if (kind === 'seal_claim' || kind === 'seal_break' || kind === 'anomaly_flare') {
        // GRAND SEAL / ANOMALY RUNIC FLARE
        drawRunePerimeter(ctx, sx, sy, r * 0.9, col, true, fade * 0.85, t * 2.5);
        ctx.globalAlpha = fade * 0.32;
        ctx.fillStyle = col;
        ctx.fillRect(sx - 22 * fade, sy - 160 * easeOut, 44 * fade, 160 * easeOut);
        for (var oi = 0; oi < 6; oi++) {
          var oa = (oi / 6) * Math.PI * 2 + u * 2.4;
          var orx = sx + Math.cos(oa) * (r * 0.65);
          var ory = sy + Math.sin(oa) * (r * 0.46) - u * 28;
          ctx.globalAlpha = fade * 0.92;
          ctx.fillStyle = '#ffd23f';
          ctx.beginPath();
          ctx.arc(orx, ory, 3.2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // Generic / secondary hit shockwave
        ctx.globalAlpha = Math.max(0.08, fade * 0.82);
        ctx.strokeStyle = col;
        ctx.lineWidth = 2.6;
        ctx.beginPath();
        ctx.arc(sx, sy, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.lineWidth = 1.4;
        ctx.setLineDash([8, 6]);
        ctx.beginPath();
        ctx.arc(sx, sy, r * 0.68, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  /* ---------- FIELD GRIMOIRE BOTTOM HUD & SANCTUARY MODAL (DOM) ---------- */
  function ensureGrimoireHudDom() {
    var el = document.getElementById('nxExpGrimoireHud');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'nxExpGrimoireHud';
    el.className = 'nx-grim-hud hidden';
    var slotsHtml = FIELD_SKILLS.map(function (s) {
      return '<button type="button" class="nx-grim-slot" data-skill="' + s.id + '">' +
        '<span class="nx-grim-key">[' + s.key + ']</span>' +
        '<b class="nx-grim-name">' + s.name + '</b>' +
        '<span class="nx-grim-sub">' + s.short + '</span>' +
        '<span class="nx-grim-cost" data-cost-for="' + s.id + '">' + s.cost + ' ✦</span>' +
        '<span class="nx-grim-cd hidden" data-cd-for="' + s.id + '"></span>' +
      '</button>';
    }).join('');
    el.innerHTML =
      '<div class="nx-grim-bar-row">' +
        '<div class="nx-grim-essence">' +
          '<span class="nx-grim-ess-label">ЭССЕНЦИЯ ПОХОДА</span>' +
          '<div class="nx-grim-ess-track"><div class="nx-grim-ess-fill" id="nxGrimEssFill"></div></div>' +
          '<span class="nx-grim-ess-val" id="nxGrimEssVal">45 / 100 ✦</span>' +
        '</div>' +
        '<div class="nx-grim-sigils" id="nxGrimSigils" title="Печати Исхода (сохраняются в Святилище)">❖ 0</div>' +
      '</div>' +
      '<div class="nx-grim-slots">' + slotsHtml + '</div>';
    document.body.appendChild(el);
    el.querySelectorAll('.nx-grim-slot').forEach(function (btn) {
      btn.addEventListener('click', function () {
        castFieldSkill(btn.getAttribute('data-skill'));
      });
    });
    return el;
  }

  function updateGrimoireHudDom() {
    var el = ensureGrimoireHudDom();
    if (X.mode !== 'exploration' || !N.G || !N.G.P || N.state === 'menu') {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    var cur = Math.floor(N.G.explorationEssence != null ? N.G.explorationEssence : 45);
    var max = N.G.explorationMaxEssence || 100;
    var fill = document.getElementById('nxGrimEssFill');
    var val = document.getElementById('nxGrimEssVal');
    var sig = document.getElementById('nxGrimSigils');
    if (fill) fill.style.width = Math.max(0, Math.min(100, Math.round((cur / max) * 100))) + '%';
    if (val) val.textContent = cur + ' / ' + max + ' ✦';
    if (sig) sig.textContent = '❖ ' + expMeta.sigils + (N.G.explorationSigilsEarned ? ' (+' + N.G.explorationSigilsEarned + ')' : '');

    FIELD_SKILLS.forEach(function (s) {
      var btn = el.querySelector('[data-skill="' + s.id + '"]');
      var costEl = el.querySelector('[data-cost-for="' + s.id + '"]');
      var cdEl = el.querySelector('[data-cd-for="' + s.id + '"]');
      var cost = effectiveSkillCost(s);
      var cd = grimoireCds[s.id] || 0;
      if (costEl) costEl.textContent = cost + ' ✦';
      if (btn) {
        btn.classList.toggle('ready', cd <= 0 && cur >= cost);
        btn.classList.toggle('no-ess', cd <= 0 && cur < cost);
        btn.classList.toggle('on-cd', cd > 0);
      }
      if (cdEl) {
        if (cd > 0) {
          cdEl.classList.remove('hidden');
          cdEl.textContent = cd.toFixed(1) + 'с';
        } else {
          cdEl.classList.add('hidden');
        }
      }
    });
  }

  function ensureSanctuaryModalDom() {
    var ov = document.getElementById('nxExpSanctuaryOv');
    if (ov) return ov;
    ov = document.createElement('div');
    ov.id = 'nxExpSanctuaryOv';
    ov.className = 'nx-sanctuary-ov hidden';
    ov.innerHTML =
      '<div class="nx-sanctuary-panel">' +
        '<div class="nx-sanctuary-head">' +
          '<div>' +
            '<div class="nx-ruins-kicker">МЕТА-ПРОГРЕССИЯ ЭКСПЕДИЦИИ · СОХРАНЯЕТСЯ МЕЖДУ ПОХОДАМИ</div>' +
            '<h2>СВЯТИЛИЩЕ ИСХОДА · КОДЕКС И РЕЛИКВИИ</h2>' +
          '</div>' +
          '<div class="nx-sanctuary-balance" id="nxSanctuaryBalance">❖ 0 ПЕЧАТЕЙ ИСХОДА</div>' +
        '</div>' +
        '<div class="nx-sanctuary-stats" id="nxSanctuaryStats"></div>' +
        '<div class="nx-sanctuary-section-title">РЕЛИКВИЯ ПОХОДА (ВЫБЕРИ ОДНУ АКТИВНУЮ)</div>' +
        '<div class="nx-sanctuary-relics" id="nxSanctuaryRelics"></div>' +
        '<div class="nx-sanctuary-section-title">АЛТАРИ СВЯТИЛИЩА (ПОСТОЯННЫЕ УЛУЧШЕНИЯ)</div>' +
        '<div class="nx-sanctuary-upgrades" id="nxSanctuaryUpgrades"></div>' +
        '<div class="nx-sanctuary-foot">' +
          '<span>Печати Исхода ❖ добываются за зачистку лагерей (+1), Мест Силы (+2), эвакуацию (+5) и победу над Владыкой Цитадели (+10).</span>' +
          '<button type="button" class="btn" id="nxSanctuaryCloseBtn">ЗАКРЫТЬ СВЯТИЛИЩЕ</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(ov);
    ov.addEventListener('click', function (ev) {
      if (ev.target === ov) closeSanctuaryModal();
    });
    var closeBtn = ov.querySelector('#nxSanctuaryCloseBtn');
    if (closeBtn) closeBtn.addEventListener('click', closeSanctuaryModal);
    return ov;
  }

  function renderSanctuaryModal() {
    var ov = ensureSanctuaryModalDom();
    var bal = ov.querySelector('#nxSanctuaryBalance');
    var st = ov.querySelector('#nxSanctuaryStats');
    var relBox = ov.querySelector('#nxSanctuaryRelics');
    var upgBox = ov.querySelector('#nxSanctuaryUpgrades');
    if (bal) bal.textContent = '❖ ' + expMeta.sigils + ' ПЕЧАТЕЙ ИСХОДА';
    if (st) {
      st.textContent = 'Успешных экспедиций: ' + (expMeta.runsCompleted || 0) +
        ' · Повержено Владык Цитадели: ' + (expMeta.bossesSlain || 0) +
        ' · Собрано Печатей Силы: ' + (expMeta.totalSeals || 0);
    }
    if (relBox) {
      relBox.innerHTML = SANCTUARY_RELICS.map(function (r) {
        var active = expMeta.activeRelic === r.id;
        return '<button type="button" class="nx-sanctuary-relic' + (active ? ' active' : '') + '" data-relic="' + r.id + '">' +
          '<b>' + r.name + (active ? ' · АКТИВНА' : '') + '</b>' +
          '<span>' + r.desc + '</span>' +
        '</button>';
      }).join('');
      relBox.querySelectorAll('[data-relic]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          selectSanctuaryRelic(btn.getAttribute('data-relic'));
        });
      });
    }
    if (upgBox) {
      upgBox.innerHTML = SANCTUARY_UPGRADES.map(function (u) {
        var lvl = expMeta.upgrades[u.id] || 0;
        var maxed = lvl >= u.max;
        var cost = upgradeCost(u.id);
        var canBuy = !maxed && expMeta.sigils >= cost;
        return '<div class="nx-sanctuary-upg' + (maxed ? ' maxed' : '') + '">' +
          '<div class="nx-upg-info">' +
            '<b>' + u.name + ' <small>РАНГ ' + lvl + ' / ' + u.max + '</small></b>' +
            '<span>' + u.desc + '</span>' +
          '</div>' +
          '<button type="button" class="nx-upg-btn' + (canBuy ? ' can-buy' : '') + '" data-upgrade="' + u.id + '"' + (canBuy ? '' : ' disabled') + '>' +
            (maxed ? 'МАКСИМУМ' : 'УЛУЧШИТЬ · ' + cost + ' ❖') +
          '</button>' +
        '</div>';
      }).join('');
      upgBox.querySelectorAll('[data-upgrade]').forEach(function (btn) {
        btn.addEventListener('click', function () {
          buySanctuaryUpgrade(btn.getAttribute('data-upgrade'));
        });
      });
    }
  }

  function openSanctuaryModal() {
    renderSanctuaryModal();
    var ov = ensureSanctuaryModalDom();
    ov.classList.remove('hidden');
    return true;
  }

  function closeSanctuaryModal() {
    var ov = document.getElementById('nxExpSanctuaryOv');
    if (ov) ov.classList.add('hidden');
    return true;
  }

  function syncSanctuaryButtons() {
    document.querySelectorAll('.nx-open-sanctuary-btn').forEach(function (btn) {
      btn.innerHTML = '❖ СВЯТИЛИЩЕ ИСХОДА · <b>' + expMeta.sigils + ' ❖</b>';
    });
  }

  /* ---------- EXPEDITION HUD, OBJECTIVE & FIELD NECROMANCY BAR (DOM) ---------- */
  function compassArrow(dx, dy) {
    var ang = Math.atan2(dy, dx) * (180 / Math.PI);
    if (ang >= -22.5 && ang < 22.5) return '→ В';
    if (ang >= 22.5 && ang < 67.5) return '↘ ЮВ';
    if (ang >= 67.5 && ang < 112.5) return '↓ Ю';
    if (ang >= 112.5 && ang < 157.5) return '↙ ЮЗ';
    if (ang >= -67.5 && ang < -22.5) return '↗ СВ';
    if (ang >= -112.5 && ang < -67.5) return '↑ С';
    if (ang >= -157.5 && ang < -112.5) return '↖ СЗ';
    return '← З';
  }

  function ensureExpHudDom() {
    var el = document.getElementById('nxExpHud');
    if (el) return el;
    el = document.createElement('div');
    el.id = 'nxExpHud';
    el.className = 'nx-exp-hud hidden';
    el.innerHTML =
      '<div class="nx-exp-header">' +
        '<span class="nx-exp-zone" id="nxExpZone">СВЯТИЛИЩЕ (0, 0)</span>' +
        '<span class="nx-exp-sep">·</span>' +
        '<span class="nx-exp-danger" id="nxExpDanger">УГРОЗА I</span>' +
        '<span class="nx-exp-sep">·</span>' +
        '<span class="nx-exp-seals" id="nxExpSeals">ПЕЧАТИ: 0 / 3</span>' +
      '</div>' +
      '<div class="nx-exp-compass" id="nxExpCompass"></div>' +
      '<div class="nx-exp-actions hidden" id="nxExpActions"></div>' +
      '<div class="nx-exp-footer">' +
        '<span id="nxExpStats">Дары: 0 · Зачищено: 0</span>' +
        '<div class="nx-exp-btn-group">' +
          '<button type="button" class="nx-stance-btn" id="nxBannerBtn" title="ПКМ по карте или [F] — направить легион в точку">[F] ЗНАМЯ ОХОТЫ</button>' +
          '<button type="button" class="nx-stance-btn" id="nxStanceBtn" title="Клавиша [E] — сменить приказ армии">[E] СТРОЙ: ОХОТА</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(el);
    var stanceBtn = el.querySelector('#nxStanceBtn');
    if (stanceBtn) {
      stanceBtn.addEventListener('click', function () {
        cycleLegionStance();
      });
    }
    var bannerBtn = el.querySelector('#nxBannerBtn');
    if (bannerBtn) {
      bannerBtn.addEventListener('click', function () {
        placeFocusBannerForward();
      });
    }
    return el;
  }

  function updateExpHudDom() {
    var el = ensureExpHudDom();
    if (X.mode !== 'exploration' || !N.G || !N.G.P || N.state === 'menu') {
      el.classList.add('hidden');
      return;
    }
    el.classList.remove('hidden');
    var run = ensureRun();
    if (!run) return;
    var P = N.G.P;
    var ax = Math.round(P.x / AREA_SIZE);
    var ay = Math.round(P.y / AREA_SIZE);
    var curMeta = getAreaMeta(run.seed, ax, ay);
    var obj = objectiveFor(run);

    var zoneEl = document.getElementById('nxExpZone');
    var dangerEl = document.getElementById('nxExpDanger');
    var sealsEl = document.getElementById('nxExpSeals');
    var compassEl = document.getElementById('nxExpCompass');
    var actionsEl = document.getElementById('nxExpActions');
    var statsEl = document.getElementById('nxExpStats');
    var stanceBtn = document.getElementById('nxStanceBtn');
    var bannerBtn = document.getElementById('nxBannerBtn');

    if (zoneEl) {
      zoneEl.textContent = (ax === 0 && ay === 0)
        ? 'СВЯТИЛИЩЕ (0, 0)'
        : curMeta.biomeName + ' (' + ax + ', ' + ay + ') · ' + curMeta.title;
      zoneEl.style.color = curMeta.biomeCol || '#8ef7c9';
    }
    if (dangerEl) {
      dangerEl.textContent = 'УГРОЗА ' + curMeta.dangerRoman;
      dangerEl.setAttribute('data-danger', String(curMeta.danger));
    }
    if (sealsEl && obj) {
      var pips = '';
      for (var pi = 0; pi < obj.requiredSeals; pi++) {
        pips += pi < obj.seals ? '◆' : '◇';
      }
      sealsEl.textContent = obj.unlocked
        ? pips + ' ПЕЧАТИ: ' + obj.seals + '/' + obj.requiredSeals + ' (ВРАТА ОТКРЫТЫ)'
        : pips + ' ПЕЧАТИ: ' + obj.seals + ' / ' + obj.requiredSeals;
      sealsEl.classList.toggle('ready', !!obj.unlocked);
    }

    var activeItems = [];
    if (obj && obj.unlocked) {
      var homeDx = -P.x, homeDy = -P.y;
      var homeDist = Math.sqrt(homeDx * homeDx + homeDy * homeDy);
      activeItems.push({
        icon: '⛨',
        title: 'ВРАТА ИСХОДА (СВЯТИЛИЩЕ)',
        danger: 1,
        dangerRoman: 'ИСХОД',
        distM: Math.max(1, Math.round(homeDist / 18)),
        dir: compassArrow(homeDx, homeDy),
        status: homeDist <= SAFE_RADIUS + 40 ? 'ГОТОВО К ВЫХОДУ' : 'ЭВАКУАЦИЯ',
        priority: 1
      });
      if (obj.citadel.status !== 'cleared') {
        var cDx = obj.citadel.x - P.x, cDy = obj.citadel.y - P.y;
        var cDist = Math.sqrt(cDx * cDx + cDy * cDy);
        activeItems.push({
          icon: '👑',
          title: 'ЦИТАДЕЛЬ ВЛАДЫКИ',
          danger: 3,
          dangerRoman: 'IV',
          distM: Math.max(1, Math.round(cDist / 18)),
          dir: compassArrow(cDx, cDy),
          status: obj.citadel.status === 'active' ? 'БОСС В БОЮ' : 'ЦЕЛЬ ПОХОДА',
          priority: 1
        });
      }
    }

    var candidates = [];
    var seenIds = new Set();
    var snap = run.snapshot();
    snap.forEach(function (d) { seenIds.add(d.id); candidates.push(d); });
    for (var rx = ax - 1; rx <= ax + 1; rx++) {
      for (var ry = ay - 1; ry <= ay + 1; ry++) {
        var preview = describeArea(run.seed, rx, ry)[0];
        if (preview && !seenIds.has(preview.id)) {
          seenIds.add(preview.id);
          candidates.push(preview);
        }
      }
    }

    candidates.forEach(function (d) {
      var isVisited = !!descriptorFor(run, d.id);
      var enc = isVisited ? encounterView(run, d.id) : null;
      var poi = isVisited ? poiView(run, d.id) : null;
      var isCleared = (poi && poi.status === 'cleared') || (enc && enc.status === 'cleared' && !poi);
      if (isCleared) return;
      var dx = d.x - P.x, dy = d.y - P.y;
      var distPx = Math.sqrt(dx * dx + dy * dy);
      var meta = getAreaMeta(run.seed, d.area.x, d.area.y);
      var icon = meta.poiSubType === 'ruins' ? '⌂' : meta.poiSubType === 'altar' ? '⛧' : meta.poiSubType === 'crypt' ? '⚱' : '◆';
      activeItems.push({
        icon: icon,
        title: meta.title,
        danger: meta.danger,
        dangerRoman: meta.dangerRoman,
        distM: Math.max(1, Math.round(distPx / 18)),
        dir: compassArrow(dx, dy),
        status: poi && poi.status === 'reward-ready' ? 'ДАРЫ ГОТОВЫ' : enc && enc.status === 'active' ? 'В БОЮ' : meta.biomeName,
        priority: 0
      });
    });

    anomalyMap(run).forEach(function (a) {
      if (a.status !== 'available') return;
      var adx = a.x - P.x, ady = a.y - P.y;
      var adist = Math.sqrt(adx * adx + ady * ady);
      if (adist <= 950) {
        activeItems.push({
          icon: '◈',
          title: a.title,
          danger: 1,
          dangerRoman: 'АНОМАЛИЯ',
          distM: Math.max(1, Math.round(adist / 18)),
          dir: compassArrow(adx, ady),
          status: a.short,
          priority: 0
        });
      }
    });

    activeItems.sort(function (a, b) {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.distM - b.distM;
    });
    var topRoutes = activeItems.slice(0, 3);

    if (compassEl) {
      compassEl.innerHTML = topRoutes.map(function (item) {
        return '<div class="nx-compass-row" data-danger="' + item.danger + '" title="' + item.title + ' · Угр. ' + item.dangerRoman + ' · ' + item.status + '">' +
          '<div class="nx-c-top">' +
            '<span class="nx-c-dir">' + item.dir + '</span>' +
            '<span class="nx-c-dist">' + item.distM + 'м · Угр. ' + item.dangerRoman + '</span>' +
          '</div>' +
          '<span class="nx-c-name">' + item.icon + ' ' + item.title + '</span>' +
          '<span class="nx-c-meta">' + item.status + '</span>' +
        '</div>';
      }).join('');
    }

    if (actionsEl) {
      var mound = nearestAvailableMound(run);
      var anom = nearestAvailableAnomaly(run);
      var canExtract = !!(obj && obj.unlocked && Math.hypot(P.x, P.y) <= SAFE_RADIUS + 40);
      if (mound || anom || canExtract) {
        actionsEl.classList.remove('hidden');

        // Anchor floating world-space prompt directly above the interactive object on screen
        var anchorWorldX = P.x, anchorWorldY = P.y - 44;
        var promptKind = 'mound';
        if (canExtract) {
          anchorWorldX = 0; anchorWorldY = -54; promptKind = 'extract';
        } else if (anom && (!mound || Math.hypot(anom.x - P.x, anom.y - P.y) <= Math.hypot(mound.x - P.x, mound.y - P.y))) {
          anchorWorldX = anom.x; anchorWorldY = anom.y - 48; promptKind = 'anomaly';
        } else if (mound) {
          anchorWorldX = mound.x; anchorWorldY = mound.y - 42; promptKind = 'mound';
        }

        if (N.w2s && N.cam) {
          var cam = N.cam();
          var sp = N.w2s(anchorWorldX, anchorWorldY);
          var clampedX = Math.max(160, Math.min((cam.w || 800) - 160, sp[0]));
          var clampedY = Math.max(128, Math.min((cam.h || 600) - 125, sp[1]));
          actionsEl.classList.add('nx-world-floating');
          actionsEl.setAttribute('data-prompt-kind', promptKind);
          actionsEl.style.left = Math.round(clampedX) + 'px';
          actionsEl.style.top = Math.round(clampedY) + 'px';
        }

        var actHtml = '';
        if (mound) {
          actHtml +=
            '<button type="button" class="nx-act-btn raise" data-act="raise"><kbd>R</kbd><span><b>ПОДНЯТЬ СТРОЙ</b><small>+1 воин · +15% урона армии</small></span></button>' +
            '<button type="button" class="nx-act-btn siphon" data-act="siphon"><kbd>Q</kbd><span><b>ПОГЛОТИТЬ ПРАХ</b><small>+40 ОЗ · +35% гнева</small></span></button>';
        }
        if (anom) {
          actHtml +=
            '<button type="button" class="nx-act-btn anomaly" data-act="anomaly"><kbd>G</kbd><span><b>' + anom.title + '</b><small>' + anom.short + '</small></span></button>';
        }
        if (canExtract) {
          actHtml +=
            '<button type="button" class="nx-act-btn extract" data-act="extract"><kbd>F</kbd><span><b>ВРАТА ИСХОДА</b><small>Завершить экспедицию и сохранить дары</small></span></button>';
        }
        if (actionsEl._lastHtml !== actHtml) {
          actionsEl._lastHtml = actHtml;
          actionsEl.innerHTML = actHtml;
          var rBtn = actionsEl.querySelector('[data-act="raise"]');
          if (rBtn) rBtn.onclick = function () { harvestMound('raise'); };
          var sBtn = actionsEl.querySelector('[data-act="siphon"]');
          if (sBtn) sBtn.onclick = function () { harvestMound('siphon'); };
          var aBtn = actionsEl.querySelector('[data-act="anomaly"]');
          if (aBtn) aBtn.onclick = function () { activateNearestAnomaly(); };
          var xBtn = actionsEl.querySelector('[data-act="extract"]');
          if (xBtn) xBtn.onclick = function () { triggerSanctuaryExtraction(); };
        }
      } else {
        actionsEl.classList.add('hidden');
      }
    }

    if (statsEl) {
      var rewardsCount = (N.G.explorationRewards || []).length;
      var clearedCount = N.G.explorationClearedCount || 0;
      var moundsCount = N.G.explorationMoundsHarvested || 0;
      var anomCount = N.G.explorationAnomaliesUsed || 0;
      statsEl.textContent = 'Дары: ' + rewardsCount + ' · Отряды: ' + clearedCount + ' · Курганы: ' + moundsCount + (anomCount ? ' · Аномалии: ' + anomCount : '');
    }

    if (stanceBtn) {
      var stanceLabels = {
        hunt: '[E] СТРОЙ: ОХОТА',
        vanguard: '[E] СТРОЙ: АВАНГАРД',
        guard: '[E] СТРОЙ: ЩИТ К НОГЕ'
      };
      stanceBtn.textContent = stanceLabels[legionStance] || '[E] СТРОЙ: ОХОТА';
      stanceBtn.setAttribute('data-stance', legionStance);
    }
    if (bannerBtn) {
      bannerBtn.textContent = focusBanner ? 'ЗНАМЯ (' + Math.ceil(focusBanner.left) + 'с)' : '[F/ПКМ] ЗНАМЯ';
      bannerBtn.setAttribute('data-stance', focusBanner ? 'vanguard' : '');
    }
  }

  X.world = {
    areaSize: AREA_SIZE,
    safeRadius: SAFE_RADIUS,
    quickDiscoverRadius: QUICK_DISCOVER_RADIUS,
    describeArea: describeArea,
    getAreaMeta: getAreaMeta,
    create: createWorld,
    current: function () { return ensureRun(); },
    setNextSeed: function (s) {
      var n = Number(s);
      if (Number.isFinite(n) && n >= 0) forcedNextSeed = (n >>> 0);
      else forcedNextSeed = null;
    }
  };
  X.encounters = {
    activationRadius: ACTIVATION_RADIUS,
    leashRadius: LEASH_RADIUS,
    delayedSpawnMs: DELAYED_SPAWN_MS,
    get: function (id) { var run = ensureRun(); return run ? encounterView(run, id) : null; }
  };
  X.pois = {
    cueRadius: RUINS_CUE_RADIUS,
    rewards: RUINS_REWARDS.map(function (r) { return { id: r.id, name: r.name, desc: r.desc }; }),
    catalog: POI_CATALOG,
    get: function (id) { var run = ensureRun(); return run ? poiView(run, id) : null; },
    claim: function (id, rewardId) { var run = ensureRun(); return run ? claimRuins(run, currentGame, id, rewardId) : false; }
  };
  X.objective = {
    requiredSeals: SEALS_REQUIRED,
    extractionRadius: EXTRACTION_RADIUS,
    status: function () {
      var run = ensureRun();
      var obj = objectiveFor(run);
      if (!obj) return null;
      return {
        seals: obj.seals,
        requiredSeals: obj.requiredSeals,
        unlocked: obj.unlocked,
        extracted: obj.extracted,
        citadel: { x: obj.citadel.x, y: obj.citadel.y, status: obj.citadel.status }
      };
    },
    extract: triggerSanctuaryExtraction,
    spawnCitadelBoss: function () { var run = ensureRun(); return run ? spawnCitadelBoss(run) : null; }
  };
  X.necromancy = {
    interactRadius: MOUND_INTERACT_RADIUS,
    nearestMound: function () { var run = ensureRun(); return nearestAvailableMound(run); },
    harvest: harvestMound,
    placeBanner: placeFocusBannerAt
  };
  X.tactics = {
    get stance() { return legionStance; },
    get banner() { return focusBanner; },
    cycleStance: cycleLegionStance
  };
  X.grimoire = {
    skills: FIELD_SKILLS.map(function (s) { return { id: s.id, key: s.key, name: s.name, cost: s.cost, cd: s.cd }; }),
    cast: castFieldSkill,
    gainEssence: gainExplorationEssence,
    status: function () {
      return {
        essence: N.G ? (N.G.explorationEssence || 0) : 0,
        maxEssence: N.G ? (N.G.explorationMaxEssence || 100) : 100,
        cooldowns: Object.assign({}, grimoireCds)
      };
    }
  };
  X.sanctuary = {
    upgrades: SANCTUARY_UPGRADES,
    relics: SANCTUARY_RELICS,
    getState: function () {
      return {
        sigils: expMeta.sigils,
        runsCompleted: expMeta.runsCompleted,
        bossesSlain: expMeta.bossesSlain,
        totalSeals: expMeta.totalSeals,
        activeRelic: expMeta.activeRelic,
        upgrades: Object.assign({}, expMeta.upgrades)
      };
    },
    awardSigils: awardSigils,
    buyUpgrade: buySanctuaryUpgrade,
    selectRelic: selectSanctuaryRelic,
    open: openSanctuaryModal,
    close: closeSanctuaryModal
  };
  X.biomes = SECTOR_BIOMES;
  X.anomalies = {
    interactRadius: ANOMALY_INTERACT_RADIUS,
    catalog: ANOMALY_CATALOG,
    ensureForArea: function (ax, ay) { var run = ensureRun(); return ensureSectorAnomaly(run, ax, ay); },
    nearest: function () { var run = ensureRun(); return nearestAvailableAnomaly(run); },
    activate: activateNearestAnomaly
  };
  X.perks = {
    catalog: EXPEDITION_PERKS.map(function (p) { return { id: p.id, name: p.name, badge: p.badge, desc: p.desc }; }),
    apply: applyExpeditionPerkById
  };

  var baseSetMode = X.setMode;
  X.setMode = function (mode) {
    var result = baseSetMode(mode);
    if (mode !== 'exploration') {
      invalidateRuinsReward();
      var hud = document.getElementById('nxExpHud');
      if (hud) hud.classList.add('hidden');
      var grim = document.getElementById('nxExpGrimoireHud');
      if (grim) grim.classList.add('hidden');
    } else {
      updateExpHudDom();
      updateGrimoireHudDom();
    }
    return result;
  };
  X.setSimulationHook(simTick);
  X.setWorldRenderHook(drawWorld);
})();
