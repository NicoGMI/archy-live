#!/usr/bin/env node
// Génère un village de démonstration dans public/data/archy-status.json (fichier ignoré par git).
// Sert à développer le village sans les vraies données : npm run demo-data
// Tous les titres sont fictifs. Ne l'exécute pas sur une machine qui publie ses vraies données :
// le script refuse d'écraser un fichier existant sans --force.
import fs from 'node:fs'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const MIN = 60000
const HOUR = 60 * MIN
const iso = (offset, now) => new Date(now + offset).toISOString()

export const DEMO_UNIVERSES = [
  ['nowl', 'Nowl', '🦉', '#c98a3a'], ['megaschool', 'MEGA.school', '🏫', '#d9663b'], ['coop', 'La Coop', '🪵', '#7f9c4a'],
  ['ngmi', 'NGMI', '🔮', '#8a63c9'], ['phil', 'Chaîne Phil', '▶️', '#e5383b'], ['cts', 'CTS', '🛒', '#e08a2e'], ['mails', 'Mails', '📬', '#3a8fc2'],
  ['isme', 'ISME', '🎓', '#2f5fa8'], ['excelia', 'Excelia', '🎓', '#b86a3c'], ['iae', 'IAE', '🎓', '#3d8a7d'], ['efrei', 'Efrei', '🎓', '#c23a55'], ['ece', 'ECE', '🎓', '#2e8fb0'],
  ['perso-bebe', 'Bébé', '🍼', '#e58aa4'], ['perso-famille', 'Famille', '🏡', '#d96f5b'], ['perso-admin', 'Papiers', '🗂️', '#8d7fb3'],
  ['conferences', 'Conférences', '🎤', '#c2a13a'],
].map(([id, name, emoji, color]) => ({id, name, emoji, color}))

// [univers, id, titre, statut, note, décalage, pièce]
const TASKS = [
  ['nowl', 'nowl-module', 'Module 3 du parcours IA', 'active', 'Rédaction du chapitre sur les prompts', -95],
  ['nowl', 'nowl-quiz', 'Quiz de fin de module', 'queued', 'À préparer après le module 3'],
  ['megaschool', 'mega-diag', 'Diagnostic IA des 40 inscrits', 'active', 'Analyse des réponses en cours', -220],
  ['megaschool', 'mega-devis', 'Devis formation équipe commerciale', 'waiting', 'Deux formules à départager'],
  ['megaschool', 'mega-relance', 'Relance des inscrits silencieux', 'done', 'Envoyée à 12 personnes', -180],
  ['coop', 'coop-charte', 'Charte de la coopérative', 'blocked', 'Il manque la signature du président'],
  ['ngmi', 'ngmi-site', 'Refonte du site NGMI', 'active', 'Intégration de la page offres', -45],
  ['ngmi', 'ngmi-offre', 'Grille tarifaire 2027', 'waiting', 'Valider la remise annuelle'],
  ['ngmi', 'ngmi-compta', 'Rapprochement bancaire', 'scheduled', 'Lancé automatiquement', 26 * 60],
  ['phil', 'phil-montage', 'Vidéo : pourquoi les agents échouent', 'active', 'Découpage du montage', -30, 'publication'],
  ['phil', 'phil-comm', 'Répondre aux commentaires', 'waiting', '3 réponses à relire', null, 'commentaires'],
  ['phil', 'phil-stats', 'Relevé analytics hebdo', 'scheduled', 'Tous les lundis', 58 * 60, 'analytics'],
  ['cts', 'cts-app', 'Application de fidélité', 'queued', 'Après la campagne', null, 'app'],
  ['cts', 'cts-campagne', 'Campagne de rentrée', 'active', 'Ciblage des segments', -320, 'strategie'],
  ['mails', 'mails-veille', 'Veille de la boîte mail', 'active', '2 messages à trier', -600],
  ['mails', 'mails-tri', 'Tri des newsletters', 'done', '48 archivées', -300],
  ['isme', 'isme-cours', 'Cours marketing digital S1', 'active', 'Diapositives 12 à 30', -60, 'prep-cours'],
  ['isme', 'isme-mail', 'Réponse à la scolarité', 'waiting', 'Date de soutenance à confirmer', null, 'archives'],
  ['excelia', 'excelia-cours', 'Étude de cas e-commerce', 'done', 'Livrée au responsable', -1400, 'prep-cours'],
  ['iae', 'iae-cours', 'Plan de cours data', 'scheduled', 'À démarrer après validation', 20 * 60, 'prep-cours'],
  ['efrei', 'efrei-mail', 'Brouillon pour la coordinatrice', 'blocked', "Attend le calendrier de l'école", null, 'archives'],
  ['ece', 'ece-cours', 'TP automatisation', 'queued', 'Sujet à écrire', null, 'prep-cours'],
  ['perso-bebe', 'bebe-creche', 'Dossier de crèche', 'waiting', 'Pièce justificative à signer'],
  ['perso-famille', 'famille-vacances', 'Comparatif vacances de février', 'active', 'Trois locations retenues', -15],
  ['perso-famille', 'famille-anniv', 'Liste des cadeaux', 'done', 'Partagée', -2000],
  ['perso-admin', 'admin-impots', 'Déclaration trimestrielle', 'scheduled', 'Échéance fin de mois', 90 * 60],
  ['conferences', 'conf-bni', 'Intervention BNI', 'active', 'Trame validée, diapos en cours', -130, 'bni'],
  ['conferences', 'conf-sh', 'Conférence Sainte-Hélène', 'queued', 'Date à confirmer', null, 'sainte-helene'],
]

export function demoData(now = Date.now()) {
  const tasks = TASKS.map(([universe, id, title, status, note, offset, room]) => {
    const t = {id, universe, title, status}
    if (note) t.note = note
    if (room) t.room = room
    if (status === 'active') t.startedAt = iso(offset * MIN, now)
    if (status === 'done') t.doneAt = iso(offset * MIN, now)
    if (status === 'scheduled') t.scheduledAt = iso(offset * MIN, now)
    return t
  })
  const log = [
    ['ngmi-site', -6, 'Page offres intégrée, reste le formulaire'],
    ['phil-montage', -14, 'Premier découpage terminé'],
    ['mega-diag', -41, '24 diagnostics sur 40 analysés'],
    ['coop-charte', -75, 'Bloqué : signature manquante'],
    ['mega-relance', -180, 'Relance envoyée'],
    ['mails-tri', -300, '48 newsletters archivées'],
  ].map(([task, offset, text]) => ({at: iso(offset * MIN, now), task, text}))
  return {
    schema: 1, updatedAt: iso(-6 * MIN, now), universes: DEMO_UNIVERSES, tasks, log,
    alerts: [{id: 'a1', universe: 'mails', text: 'Mail important de la scolarité ISME', icon: '✉', at: iso(-2 * HOUR, now)}],
    stats: {youtube: {subscribers: 1284, views28d: 15320, latest: {title: 'Ce que les agents ne savent pas faire', views: 842, likes: 91}, top: {title: 'Mon assistant IA en vrai', views: 6120}, at: iso(-3 * HOUR, now)}},
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const out = fileURLToPath(new URL('../public/data/archy-status.json', import.meta.url))
  if (fs.existsSync(out) && !process.argv.includes('--force')) {
    console.error('public/data/archy-status.json existe déjà : relance avec --force pour le remplacer.')
    process.exit(1)
  }
  fs.writeFileSync(out, JSON.stringify(demoData(), null, 2) + '\n')
  console.log('Village de démonstration écrit dans', out)
}
