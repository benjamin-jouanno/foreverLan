const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

// Isoler les transitions du journal, sans navigateur ni modification du stockage réel.
function createApp(saved = {}, sessionSaved = {}) {
  const storage = new Map(Object.entries(saved));
  const session = new Map(Object.entries(sessionSaved));
  const angular = {
    Component: () => target => target,
    ViewChild: () => () => {},
    signal: initial => {
      let value = initial;
      const read = () => value;
      read.set = next => { value = next; };
      read.update = update => { value = update(value); };
      return read;
    },
    computed: read => read,
    bootstrapApplication: () => Promise.resolve()
  };
  const context = vm.createContext({
    require: () => angular,
    exports: {},
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
    sessionStorage: { getItem: key => session.get(key) ?? null, setItem: (key, value) => session.set(key, value), removeItem: key => session.delete(key) },
    setTimeout: () => 0,
    clearTimeout: () => {},
    console
  });
  const source = fs.readFileSync('src/main.ts', 'utf8');
  const compiled = ts.transpileModule(source + '\nglobalThis.TestApp = App;', {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, experimentalDecorators: true }
  }).outputText;
  vm.runInContext(compiled, context);
  const app = new context.TestApp();
  const dialog = { open: false, showModal() { this.open = true; }, close() { this.open = false; } };
  app.questDialog = { nativeElement: dialog };
  const profileDialog = { open: false, showModal() { this.open = true; }, close() { this.open = false; } };
  app.profileDialog = { nativeElement: profileDialog };
  return { app, storage, dialog, session, profileDialog };
}

test('ouvrir les détails ne valide pas la quête et ne rapporte aucune pièce', () => {
  const { app, dialog } = createApp();
  app.openQuest(app.quests[0]);
  assert.equal(dialog.open, true);
  assert.equal(app.selectedQuest().id, 101);
  assert.equal(app.completed().length, 0);
  assert.equal(app.coins(), 0);
  app.closeQuest();
  assert.equal(dialog.open, false);
  assert.equal(app.selectedQuest(), null);
});

test('la validation nécessite la quête ouverte et ne crédite les pièces qu’une fois', () => {
  const { app, storage, dialog } = createApp();
  const quest = app.quests[0];
  app.complete(quest);
  assert.equal(app.coins(), 0);
  app.openQuest(quest);
  app.complete(app.quests[1]);
  assert.equal(app.coins(), 0);
  app.complete(quest);
  assert.equal(app.coins(), quest.coins);
  assert.equal(dialog.open, false);
  assert.deepEqual(JSON.parse(storage.get('forever-lan-completed-v2')), [quest.id]);
  app.openQuest(quest);
  app.complete(quest);
  assert.equal(app.coins(), quest.coins);
  assert.equal(app.completed().length, 1);
});

test('les validations sauvegardées restaurent le solde sans identifiants inconnus ni doublons', () => {
  const { app } = createApp({ 'forever-lan-completed-v2': '[101,102,102,999]' });
  assert.equal(app.completed().length, 2);
  assert.equal(app.coins(), app.quests[0].coins + app.quests[1].coins);
});

test('les anciennes quêtes de démonstration ne valident pas les nouvelles quêtes', () => {
  const { app } = createApp({ 'forever-lan-quests-v1': JSON.stringify([
    { id: 1, status: 'completed' }, { id: 2, status: 'active' }, { id: 999, status: 'completed' }
  ]) });
  assert.equal(app.completed().length, 0);
  assert.equal(app.coins(), 0);
  const { app: previous } = createApp({
    'forever-lan-completed-v2': '[1,2,3,4,5,6]',
    'forever-lan-hidden-completed-v1': '["welcome-azeroth"]'
  });
  assert.equal(previous.completed().length, 0);
  assert.equal(previous.unlockedHidden().length, 1);
  assert.equal(previous.coins(), 1);
});

test('terminer une quête classique ne débloque aucun haut fait caché', () => {
  const { app } = createApp();
  app.openQuest(app.quests[0]);
  app.complete(app.quests[0]);
  assert.equal(app.completed().length, 1);
  assert.equal(app.unlockedHidden().length, 0);
});

test('un code vide ou inconnu ne change aucune progression ni récompense', () => {
  const { app, storage } = createApp();
  for (const code of ['', '   ', 'INCONNU']) {
    app.questCode.set(code);
    app.redeemCode();
    assert.equal(app.codeFeedbackState(), 'error');
    assert.equal(app.unlockedHidden().length, 0);
    assert.equal(app.coins(), 0);
    assert.equal(storage.has('forever-lan-hidden-completed-v1'), false);
  }
});

test('un code valide révèle et accomplit automatiquement un secret sans modifier les quêtes', () => {
  const { app, storage } = createApp();
  app.questCode.set('  lan-a7k2  ');
  app.redeemCode();
  assert.equal(app.unlockedHidden().length, 1);
  assert.equal(app.unlockedHidden()[0].title, 'Bienvenue en Azeroth');
  assert.equal(app.coins(), 1);
  assert.equal(app.completed().length, 0);
  assert.equal(app.progress(), 0);
  assert.equal(app.codeFeedbackState(), 'success');
  assert.equal(app.questCode(), '');
  assert.deepEqual(JSON.parse(storage.get('forever-lan-hidden-completed-v1')), ['welcome-azeroth']);
  app.questCode.set('LAN-A7K2');
  app.redeemCode();
  assert.equal(app.codeFeedbackState(), 'duplicate');
  assert.equal(app.unlockedHidden().length, 1);
  assert.equal(app.coins(), 1);
});

test('les hauts faits et leur solde sont restaurés séparément des quêtes classiques', () => {
  const { app } = createApp({
    'forever-lan-completed-v2': '[101]',
    'forever-lan-hidden-completed-v1': '["welcome-azeroth","welcome-azeroth","unknown"]'
  });
  assert.equal(app.completed().length, 1);
  assert.equal(app.unlockedHidden().length, 1);
  assert.equal(app.coins(), app.quests[0].coins + 1);
  app.questCode.set('LAN-A7K2');
  app.redeemCode();
  assert.equal(app.codeFeedbackState(), 'duplicate');
  assert.equal(app.coins(), app.quests[0].coins + 1);
});

test('une sauvegarde de secrets invalide laisse les quêtes classiques intactes', () => {
  for (const saved of ['invalid', '{}', 'null', '[false, 1, null]']) {
    const { app } = createApp({ 'forever-lan-completed-v2': '[102]', 'forever-lan-hidden-completed-v1': saved });
    assert.equal(app.unlockedHidden().length, 0);
    assert.equal(app.completed().length, 1);
    assert.equal(app.coins(), app.quests[1].coins);
  }
});

test('le code admin exact ouvre son onglet sans débloquer de quête ni créditer de pièces', () => {
  const { app, session, storage } = createApp();
  assert.equal(app.adminUnlocked(), false);
  app.questCode.set('BenichouAdmin31600');
  app.redeemCode();
  assert.equal(app.adminUnlocked(), true);
  assert.equal(app.view(), 'admin');
  assert.equal(app.questCode(), '');
  assert.equal(app.unlockedHidden().length, 0);
  assert.equal(app.completed().length, 0);
  assert.equal(app.coins(), 0);
  assert.equal(storage.size, 0);
  assert.equal(session.get('forever-lan-admin-session'), 'unlocked');
  assert.equal(app.adminQuests.length, app.hiddenQuestCount);
  assert.ok(app.adminQuests.every(q => q.code && q.title && q.description));
});

test('le code admin respecte strictement la casse et les espaces', () => {
  const { app } = createApp();
  for (const code of ['benichouadmin31600', 'BENICHOUADMIN31600', 'Benichouadmin31600', ' BenichouAdmin31600', 'BenichouAdmin31600 ']) {
    app.questCode.set(code);
    app.redeemCode();
    assert.equal(app.adminUnlocked(), false);
    assert.equal(app.codeFeedbackState(), 'error');
  }
});

test('la session admin est restaurée et peut être quittée sans effacer les quêtes', () => {
  const { app, session } = createApp({ 'forever-lan-completed-v2': '[101]' }, { 'forever-lan-admin-session': 'unlocked' });
  assert.equal(app.adminUnlocked(), true);
  app.view.set('admin');
  app.lockAdmin();
  assert.equal(app.adminUnlocked(), false);
  assert.equal(app.view(), 'achievements');
  assert.equal(session.has('forever-lan-admin-session'), false);
  assert.equal(app.completed().length, 1);
});

test('terminer les 11 quêtes officielles rapporte 13 pièces et restaure toute la progression', () => {
  const { app, storage } = createApp();
  assert.equal(app.quests.length, 11);
  for (const quest of app.quests) {
    app.openQuest(quest);
    app.complete(quest);
  }
  assert.equal(app.coins(), 13);
  assert.equal(app.progress(), 100);
  assert.equal(app.remaining(), 0);
  assert.equal(app.unlockedHidden().length, 0);
  const { app: restored } = createApp(Object.fromEntries(storage));
  assert.equal(restored.completed().length, 11);
  assert.equal(restored.coins(), 13);
  assert.equal(restored.progress(), 100);
});

test('les 13 codes officiels débloquent 14 pièces une seule fois, sans valider les quêtes visibles', () => {
  const { app, storage } = createApp();
  assert.equal(app.hiddenQuestCount, 13);
  assert.equal(new Set(app.adminQuests.map(q => q.code)).size, 13);
  for (const secret of app.adminQuests) {
    app.questCode.set(secret.code);
    app.redeemCode();
    assert.equal(app.codeFeedbackState(), 'success');
    app.questCode.set(secret.code);
    app.redeemCode();
    assert.equal(app.codeFeedbackState(), 'duplicate');
  }
  assert.equal(app.unlockedHidden().length, 13);
  assert.equal(app.coins(), 14);
  assert.equal(app.completed().length, 0);
  const { app: restored } = createApp(Object.fromEntries(storage));
  assert.equal(restored.unlockedHidden().length, 13);
  assert.equal(restored.coins(), 14);
});

test('les anciens secrets de démonstration sont ignorés sans effacer les quêtes visibles', () => {
  const { app } = createApp({
    'forever-lan-completed-v2': '[101,102]',
    'forever-lan-hidden-completed-v1': '["tavern-secret","forgotten-rune","living-legend"]'
  });
  assert.equal(app.unlockedHidden().length, 0);
  assert.equal(app.completed().length, 2);
  assert.equal(app.coins(), 2);
  for (const code of ['LAN-TAVERNE', 'LAN-SECRET', 'LAN-LEGENDE']) {
    app.questCode.set(code);
    app.redeemCode();
    assert.equal(app.codeFeedbackState(), 'error');
    assert.equal(app.coins(), 2);
  }
});

test('la première visite demande un profil complet puis le conserve après rechargement', () => {
  const { app, storage, profileDialog } = createApp();
  app.ngAfterViewInit();
  assert.equal(profileDialog.open, true);
  assert.equal(app.profile(), null);
  app.profileName.set('  Thalarion  ');
  app.profileRace.set('Humain');
  app.profileClass.set('Mage');
  app.saveProfile();
  assert.equal(profileDialog.open, false);
  assert.deepEqual(JSON.parse(storage.get('forever-lan-profile-v1')), { name: 'Thalarion', race: 'Humain', wowClass: 'Mage' });
  assert.equal(app.profile().name, 'Thalarion');
  assert.equal(app.profileIcon(), '🪄');
  const restored = createApp(Object.fromEntries(storage));
  restored.app.ngAfterViewInit();
  assert.equal(restored.profileDialog.open, false);
  assert.equal(restored.app.profile().name, 'Thalarion');
});

test('un nom vide ou une sélection invalide ne ferme pas la création du profil', () => {
  const { app, storage, profileDialog } = createApp();
  app.ngAfterViewInit();
  for (const [name, race, wowClass] of [['   ', 'Humain', 'Mage'], ['A'.repeat(33), 'Humain', 'Mage'], ['Thalarion', '', 'Mage'], ['Thalarion', 'Humain', 'Inconnu']]) {
    app.profileName.set(name); app.profileRace.set(race); app.profileClass.set(wowClass);
    app.saveProfile();
    assert.equal(app.profile(), null);
    assert.equal(profileDialog.open, true);
    assert.ok(app.profileError());
    assert.equal(storage.has('forever-lan-profile-v1'), false);
  }
});

test('un profil sauvegardé invalide redemande la création sans effacer la progression', () => {
  for (const saved of ['invalid', 'null', '{}', '{"name":"   ","race":"Humain","wowClass":"Mage"}']) {
    const { app, profileDialog } = createApp({ 'forever-lan-profile-v1': saved, 'forever-lan-completed-v2': '[101]' });
    app.ngAfterViewInit();
    assert.equal(profileDialog.open, true);
    assert.equal(app.profile(), null);
    assert.equal(app.completed().length, 1);
  }
});

test('modifier son profil conserve les quêtes, les pièces et les hauts faits', () => {
  const { app, storage } = createApp({
    'forever-lan-profile-v1': JSON.stringify({ name: 'Thalarion', race: 'Humain', wowClass: 'Mage' }),
    'forever-lan-completed-v2': '[101]',
    'forever-lan-hidden-completed-v1': '["welcome-azeroth"]'
  });
  app.openProfile();
  assert.equal(app.profileName(), 'Thalarion');
  app.profileName.set('Grimbrak'); app.profileRace.set('Orc'); app.profileClass.set('Guerrier');
  app.saveProfile();
  assert.equal(app.profile().name, 'Grimbrak');
  assert.equal(app.profileIcon(), '⚔️');
  assert.equal(app.completed().length, 1);
  assert.equal(app.unlockedHidden().length, 1);
  assert.equal(app.coins(), 2);
  assert.equal(JSON.parse(storage.get('forever-lan-profile-v1')).race, 'Orc');
});
