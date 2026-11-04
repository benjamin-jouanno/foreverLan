import { Component, ElementRef, ViewChild, computed, signal } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';

interface Quest { id: number; title: string; category: 'En jeu' | 'IRL'; description: string; objective: string; coins: number; icon: string; }
// Le catalogue reste dans le code du site ; seule la progression est enregistrée.
const QUESTS: readonly Quest[] = [
 // Identifiants distincts de la démonstration pour éviter toute validation héritée.
 {id:101,title:"Le début d'une légende",category:'En jeu',description:'Chaque légende commence par un premier pas. Faites vos armes en Azeroth et franchissez votre premier cap.',objective:'Atteindre le niveau 10',coins:1,icon:'🌱'},
 {id:102,title:"L'aventurier",category:'En jeu',description:'Les routes d’Azeroth n’attendent que vous. Poursuivez votre aventure et prouvez votre valeur.',objective:'Atteindre le niveau 20',coins:1,icon:'⚔️'},
 {id:103,title:'Le vétéran',category:'En jeu',description:'Les combats vous ont endurci. Continuez votre progression pour rejoindre les aventuriers chevronnés.',objective:'Atteindre le niveau 30',coins:1,icon:'🛡️'},
 {id:104,title:"Le héros d'Azeroth",category:'En jeu',description:'Votre réputation grandit à chaque victoire. Franchissez ce nouveau cap et inscrivez votre nom parmi les héros.',objective:'Atteindre le niveau 40',coins:1,icon:'🐉'},
 {id:105,title:'Le premier donjon',category:'En jeu',description:'Rassemblez votre groupe et aventurez-vous dans les profondeurs. Ensemble, venez à bout de votre premier donjon.',objective:'Terminer un donjon avec le groupe',coins:1,icon:'🏰'},
 {id:106,title:'Le pilier de comptoir',category:'En jeu',description:'La taverne d’Azeroth vous accueille. Pour ce défi, tout se passe dans le jeu : faites découvrir les boissons locales à votre personnage.',objective:'Être complètement ivre dans WoW',coins:1,icon:'🍺'},
 {id:107,title:'Le mendiant',category:'En jeu',description:'Rangez votre fierté un instant et tentez votre chance auprès d’un inconnu. Sa générosité pourrait remplir votre bourse.',objective:"Obtenir une pièce d'argent d'un inconnu dans WoW",coins:1,icon:'🧙'},
 {id:108,title:"Le cuisinier d'Azeroth",category:'IRL',description:'Une guilde ne part pas à l’aventure le ventre vide. Quittez votre clavier et préparez un repas pour toute la compagnie.',objective:'Préparer un repas pour les 5 joueurs',coins:2,icon:'🍳'},
 {id:109,title:'Le diplomate',category:'IRL',description:'Rassemblez vos compagnons et trouvez les mots qui rallieront la guilde. Que votre voix fasse vibrer la taverne !',objective:'Faire un discours épique de 30 secondes devant la guilde',coins:1,icon:'🗣️'},
 {id:110,title:'La réunification des braves',category:'En jeu',description:'Immortalisez votre compagnie en Azeroth. Réunissez vos personnages et prenez la pose pour un souvenir de la LAN.',objective:"Réunir les cinq personnages pour une capture d'écran",coins:1,icon:'📷'},
 {id:111,title:'Les cinq compagnons',category:'En jeu',description:'Cette fois, toute la compagnie répond à l’appel. Partez à cinq et triomphez ensemble des épreuves d’un donjon.',objective:'Terminer un donjon avec les 5 joueurs',coins:2,icon:'🐉'}
];
const STORAGE_KEY = 'forever-lan-completed-v2';
interface HiddenQuest { id: string; code: string; title: string; description: string; coins: number; icon: string; }
// Codes organisateur : modifier ce catalogue pour préparer les secrets de la LAN.
const HIDDEN_QUESTS: readonly HiddenQuest[] = [
 {id:'welcome-azeroth',code:'LAN-A7K2',title:'Bienvenue en Azeroth',description:'Être le premier joueur à mourir',coins:1,icon:'💀'},
 {id:'sheep',code:'LAN-M4R9',title:'Bêêêê !',description:'Se faire transformer en mouton',coins:1,icon:'🐑'},
 {id:'sandman',code:'LAN-P8D3',title:'Le marchand de sable',description:"Être le premier joueur à s'endormir pendant la LAN",coins:1,icon:'😴'},
 {id:'last-awake',code:'LAN-V2N6',title:'Le dernier survivant',description:'Être le dernier joueur encore éveillé un soir',coins:1,icon:'🍕'},
 {id:'human-jukebox',code:'LAN-C9F4',title:'Le jukebox humain',description:'Se mettre spontanément à chanter une chanson',coins:1,icon:'🎤'},
 {id:'hungry',code:'LAN-H3T7',title:'Le ventre sur pattes',description:'Être le premier à demander quand on mange',coins:1,icon:'🍽️'},
 {id:'professional-grumbler',code:'LAN-B6W2',title:'Le râleur professionnel',description:"Se plaindre trois fois d'une mécanique du jeu",coins:1,icon:'🗣️'},
 {id:'true-friend',code:'LAN-Q5J8',title:'Un véritable ami',description:'Offrir spontanément un objet utile à un autre joueur',coins:1,icon:'❤️'},
 {id:'protector',code:'LAN-E7S3',title:'Pas touche à mon pote !',description:'Sauver un joueur qui allait mourir',coins:1,icon:'🛡️'},
 {id:'party-wipe',code:'LAN-Z4L9',title:'Le boulet du groupe',description:'Provoquer accidentellement la mort de tout le groupe',coins:1,icon:'🤡'},
 {id:'santa',code:'LAN-G2X6',title:'Le père Noël',description:'Offrir un snack à un autre joueur sans rien demander en retour',coins:1,icon:'🎁'},
 {id:'mischievous',code:'LAN-U8Y5',title:'Le malicieux',description:'Envoyer un joueur à travers un portail vers un endroit inconnu',coins:1,icon:'🤡'},
 {id:'unexpected-hero',code:'LAN-K9D7',title:'Le héros inattendu',description:'Être le dernier survivant et terminer un combat de boss',coins:2,icon:'🐉'}
];
const HIDDEN_STORAGE_KEY = 'forever-lan-hidden-completed-v1';
const ADMIN_SESSION_KEY = 'forever-lan-admin-session';
interface PlayerProfile { name: string; race: string; wowClass: string; }
const PROFILE_STORAGE_KEY = 'forever-lan-profile-v1';
const RACES = ['Humain','Nain','Elfe de la nuit','Gnome','Orc','Mort-vivant','Tauren','Troll'];
const CLASSES = ['Guerrier','Paladin','Chasseur','Voleur','Prêtre','Chaman','Mage','Démoniste','Druide'];
interface TavernItem { id: string; name: string; description: string; category: string; price: number; icon: string; }
// Carte et tarifs provisoires, à remplacer par la liste définitive de la LAN.
const TAVERN_ITEMS: readonly TavernItem[] = [
 {id:'kinder-maxi',name:'Kinder Maxi',description:'Une barre de chocolat au lait pour une pause bien méritée.',category:'Sucré',price:1,icon:'🍫'},
 {id:'bonbons',name:'Bonbons',description:'Une portion de douceurs pour refaire le plein de bonne humeur.',category:'Sucré',price:1,icon:'🍬'},
 {id:'pancake-chocolat',name:'Pancake au chocolat',description:'Un pancake gourmand, garni de chocolat.',category:'Sucré',price:2,icon:'🥞'},
 {id:'cookie',name:'Cookie',description:'Un cookie aux pépites de chocolat pour accompagner la pause.',category:'Sucré',price:1,icon:'🍪'},
 {id:'chips',name:'Chips',description:'Une portion croustillante à grignoter entre deux aventures.',category:'Salé',price:1,icon:'🥔'},
 {id:'pop-corn',name:'Pop-corn',description:'Une portion à savourer en regardant les exploits de la guilde.',category:'Salé',price:1,icon:'🍿'},
 {id:'soda',name:'Soda',description:'Une canette bien fraîche, au choix selon les boissons disponibles.',category:'Boissons',price:2,icon:'🥤'},
 {id:'jus',name:'Jus de fruits',description:'Un verre fruité pour une pause rafraîchissante.',category:'Boissons',price:1,icon:'🧃'},
 {id:'chocolat-chaud',name:'Chocolat chaud',description:'Une tasse réconfortante pour les longues soirées à la taverne.',category:'Boissons',price:2,icon:'☕'}
];
@Component({selector:'app-root',standalone:true,templateUrl:'./app.html'})
class App {
 @ViewChild('profileDialog') profileDialog!: ElementRef<HTMLDialogElement>;
 readonly races=RACES;
 readonly classes=CLASSES;
 profile=signal<PlayerProfile|null>(this.loadProfile());
 profileName=signal(''); profileRace=signal(''); profileClass=signal(''); profileError=signal('');
 ngAfterViewInit(){if(!this.profile())this.openProfile();}
 loadProfile():PlayerProfile|null{
   try{
     const data=JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY)??'null');
     if(data&&typeof data.name==='string'&&data.name.trim().length>0&&data.name.trim().length<=32&&RACES.includes(data.race)&&CLASSES.includes(data.wowClass))return {name:data.name.trim(),race:data.race,wowClass:data.wowClass};
   }catch{}
   return null;
 }
 openProfile(){
   const current=this.profile();
   this.profileName.set(current?.name??'');this.profileRace.set(current?.race??'');this.profileClass.set(current?.wowClass??'');this.profileError.set('');
   this.profileDialog.nativeElement.showModal();
 }
 saveProfile(){
   const name=this.profileName().trim();
   if(!name||name.length>32||!RACES.includes(this.profileRace())||!CLASSES.includes(this.profileClass())){this.profileError.set('Renseignez un nom de 1 à 32 caractères, une race et une classe.');return;}
   const profile={name,race:this.profileRace(),wowClass:this.profileClass()};
   this.profile.set(profile);
   try{localStorage.setItem(PROFILE_STORAGE_KEY,JSON.stringify(profile));}catch{this.notify('Profil créé pour cette session. Sauvegarde indisponible : gardez cet onglet ouvert.');}
   this.profileDialog.nativeElement.close();
 }
 profileIcon(){return ({Guerrier:'⚔️',Paladin:'🛡️',Chasseur:'🏹',Voleur:'🗡️',Prêtre:'✨',Chaman:'⚡',Mage:'🪄',Démoniste:'🔮',Druide:'🌿'} as Record<string,string>)[this.profile()?.wowClass??'']??'🧙';}
 @ViewChild('questDialog') questDialog!: ElementRef<HTMLDialogElement>;
 selectedQuest=signal<Quest|null>(null);
 openQuest(quest:Quest){this.selectedQuest.set(quest);this.questDialog.nativeElement.showModal();}
 closeQuest(){this.questDialog.nativeElement.close();this.selectedQuest.set(null);}
 dismissBackdrop(event:MouseEvent){
   if(event.target!==this.questDialog.nativeElement)return;
   const rect=this.questDialog.nativeElement.getBoundingClientRect();
   if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)this.closeQuest();
 }
 readonly quests=QUESTS;
 readonly tavernCategories=['Tout','Sucré','Salé','Boissons'];
 tavernCategory=signal('Tout');
 tavernItems=computed(()=>TAVERN_ITEMS.filter(item=>this.tavernCategory()==='Tout'||item.category===this.tavernCategory()));
 readonly adminQuests=HIDDEN_QUESTS;
 adminUnlocked=signal(this.loadAdminSession());
 loadAdminSession():boolean{try{return sessionStorage.getItem(ADMIN_SESSION_KEY)==='unlocked';}catch{return false;}}
 lockAdmin(){
   this.adminUnlocked.set(false);
   if(this.view()==='admin')this.view.set('achievements');
   try{sessionStorage.removeItem(ADMIN_SESSION_KEY);}catch{}
 }
 readonly hiddenQuestCount=HIDDEN_QUESTS.length;
 hiddenCompletedIds=signal<string[]>(this.loadHidden());
 unlockedHidden=computed(()=>this.hiddenCompletedIds().map(id=>HIDDEN_QUESTS.find(q=>q.id===id)!));
 questCode=signal('');
 codeFeedback=signal('');
 codeFeedbackState=signal<'success'|'error'|'duplicate'>('success');
 loadHidden():string[]{
   try{const ids:unknown=JSON.parse(localStorage.getItem(HIDDEN_STORAGE_KEY)??'[]');return Array.isArray(ids)?[...new Set(ids.filter((id):id is string=>typeof id==='string'&&HIDDEN_QUESTS.some(q=>q.id===id)))]:[];}catch{return [];}
 }
 redeemCode(){
   if(this.questCode()==='BenichouAdmin31600'){
     this.adminUnlocked.set(true);
     try{sessionStorage.setItem(ADMIN_SESSION_KEY,'unlocked');}catch{}
     this.questCode.set('');this.codeFeedback.set('');this.view.set('admin');
     this.notify('Mode administrateur déverrouillé.');return;
   }
   const code=this.questCode().trim().toUpperCase();
   const quest=HIDDEN_QUESTS.find(q=>q.code===code);
   if(!quest){this.codeFeedbackState.set('error');this.codeFeedback.set(code?'Ce code est inconnu. Vérifiez votre saisie et réessayez.':'Saisissez un code pour révéler un haut fait caché.');return;}
   if(this.hiddenCompletedIds().includes(quest.id)){this.codeFeedbackState.set('duplicate');this.codeFeedback.set('Vous avez déjà débloqué ce haut fait. Sa récompense a déjà été obtenue.');return;}
   this.hiddenCompletedIds.update(ids=>[...ids,quest.id]);
   this.codeFeedbackState.set('success');this.codeFeedback.set(`Haut fait révélé : ${quest.title} ! +${quest.coins} ${quest.coins===1?'pièce':'pièces'}.`);this.questCode.set('');
   try{localStorage.setItem(HIDDEN_STORAGE_KEY,JSON.stringify(this.hiddenCompletedIds()));}catch{this.codeFeedback.set('Haut fait débloqué pour cette session. Sauvegarde indisponible : gardez cet onglet ouvert.');}
 }
 readonly tabs=['Toutes','À accomplir','Terminées'];
 readonly categories=['Toutes les quêtes','En jeu','IRL'];
 completedIds=signal<number[]>(this.load()); view=signal('journal'); status=signal('Toutes'); category=signal('Toutes les quêtes'); search=signal(''); notice=signal('');
 completed=computed(()=>this.quests.filter(q=>this.isCompleted(q)));
 remaining=computed(()=>this.quests.length-this.completed().length);
 coins=computed(()=>this.completed().reduce((total,q)=>total+q.coins,0)+this.unlockedHidden().reduce((total,q)=>total+q.coins,0));
 progress=computed(()=>Math.round(this.completed().length/this.quests.length*100));
 recent=computed(()=>this.completedIds().slice(-3).reverse().map(id=>this.quests.find(q=>q.id===id)!));
 categoryCompleted(cat:string){return this.completed().filter(q=>q.category===cat).length;}
 questIcon(id:number){return this.quests.find(q=>q.id===id)?.icon??'📜';}
 filtered=computed(()=>this.quests.filter(q=>(this.category()==='Toutes les quêtes'||q.category===this.category())&&(this.status()==='Toutes'||this.isCompleted(q)===(this.status()==='Terminées'))&&this.normalize(`${q.title} ${q.description} ${q.objective}`).includes(this.normalize(this.search()))));
 normalize(value:string){return value.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
 isCompleted(q:Quest){return this.completedIds().includes(q.id);}
 count(tab:string){return tab==='Toutes'?this.quests.length:tab==='Terminées'?this.completed().length:this.remaining();}
 categoryCount(cat:string){return this.quests.filter(q=>cat==='Toutes les quêtes'||q.category===cat).length;}
 categoryIcon(cat:string){return cat==='En jeu'?'⚔':cat==='IRL'?'⚑':'▤';}
 load():number[]{
   try{
     const stored=localStorage.getItem(STORAGE_KEY);
     if(stored!==null){const ids:unknown=JSON.parse(stored);return Array.isArray(ids)?QUESTS.filter(q=>ids.includes(q.id)).map(q=>q.id):[];}
   // Ne reprendre que les identifiants du catalogue actuel, indépendants de la démonstration.
     const legacy:unknown=JSON.parse(localStorage.getItem('forever-lan-quests-v1')??'[]');
     return Array.isArray(legacy)?QUESTS.filter(q=>legacy.some(item=>item?.id===q.id&&item?.status==='completed')).map(q=>q.id):[];
   }catch{return [];}
 }
 complete(q:Quest){
   if(this.selectedQuest()?.id!==q.id||this.isCompleted(q)||!this.quests.some(item=>item.id===q.id))return;
   this.completedIds.update(ids=>[...ids,q.id]);this.notify(`Quête terminée ! +${q.coins} ${q.coins===1?'pièce':'pièces'}`);
   try{localStorage.setItem(STORAGE_KEY,JSON.stringify(this.completedIds()));}catch{this.notify('Sauvegarde indisponible. Gardez cet onglet ouvert pour conserver votre progression.');}
   this.closeQuest();
 }
 clearFilters(){this.category.set('Toutes les quêtes');this.status.set('Toutes');this.search.set('');}
 timer:ReturnType<typeof setTimeout>|undefined;
 notify(message:string){this.notice.set(message);clearTimeout(this.timer);this.timer=setTimeout(()=>this.notice.set(''),4000);}
}
bootstrapApplication(App).catch(console.error);
