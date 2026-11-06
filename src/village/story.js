// Ce que disent les habitants. Aucune phrase n'invente un fait : tout vient des champs de la tâche.
// Module pur, testé sous Node. Les dates formatées sont passées par l'appelant.

export const STATUS_WORD = {active: 'en cours', waiting: 'attend ta décision', blocked: 'bloqué', scheduled: 'programmé', queued: 'en file', done: 'terminé'}

const lastNews = (task, log) => log.filter((l) => l.task === task.id).sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]

/** Répliques d'un habitant, dans l'ordre. */
export function dialogueFor(task, log = [], {when = () => ''} = {}) {
  const note = task.note?.trim()
  const news = lastNews(task, log)
  const newsLine = news ? `Dernière nouvelle, ${when(news.at)} : ${news.text}` : null
  switch (task.status) {
    case 'active':
      return [`Je travaille sur « ${task.title} ».`, note, newsLine].filter(Boolean)
    case 'waiting':
      return [`J'attends ta décision pour « ${task.title} ».`, note || "Rien de précis n'a été noté pour l'instant.", newsLine].filter(Boolean)
    case 'blocked':
      return [`Je suis bloqué sur « ${task.title} ».`, note || "La raison n'a pas été notée.", newsLine].filter(Boolean)
    case 'scheduled':
      return [`« ${task.title} » est programmé${task.scheduledAt ? ` pour ${when(task.scheduledAt)}` : ''}.`, note, newsLine].filter(Boolean)
    case 'queued':
      return [`« ${task.title} » attend son tour.`, note].filter(Boolean)
    default:
      return [`« ${task.title} » est terminé${task.doneAt ? ` depuis ${when(task.doneAt)}` : ''}.`, note].filter(Boolean)
  }
}

export function archyDialogue(data, {when = () => ''} = {}) {
  const entries = [...(data?.log || [])].sort((a, b) => Date.parse(b.at) - Date.parse(a.at)).slice(0, 3)
  if (!entries.length) return ["Je n'ai encore rien noté au journal."]
  return entries.map((e) => {
    const task = data.tasks.find((t) => t.id === e.task)
    return `${when(e.at)}${task ? ` · ${task.title}` : ''} : ${e.text}`
  })
}

// ---------------------------------------------------------------- La tournée du boss

/** Clé d'une visite : si le statut change, l'habitant redevient à voir. */
const visitKey = (t) => t.id + '|' + t.status + '|' + (t.note || '')

/** Tâches à aller voir, les bloquées d'abord. Rien n'est modifié côté données. */
export function tourStops(tasks = [], seen = {}) {
  const stops = tasks.filter((t) => t.status === 'blocked' || t.status === 'waiting')
  const order = {blocked: 0, waiting: 1}
  const sorted = [...stops].sort((a, b) => order[a.status] - order[b.status])
  const remaining = sorted.filter((t) => !seen[visitKey(t)])
  return {all: sorted, remaining, done: sorted.length - remaining.length, total: sorted.length}
}

export const markSeen = (seen, task) => ({...seen, [visitKey(task)]: Date.now()})

// ---------------------------------------------------------------- Lecture rapide

export function counts(tasks = [], now = Date.now(), dayKey = () => '') {
  const n = (s) => tasks.filter((t) => t.status === s).length
  const today = dayKey(new Date(now).toISOString())
  return {
    active: n('active'), waiting: n('waiting'), blocked: n('blocked'), scheduled: n('scheduled'), queued: n('queued'),
    done: n('done'), doneToday: tasks.filter((t) => t.status === 'done' && t.doneAt && dayKey(t.doneAt) === today).length,
  }
}

/** Le statut le plus urgent d'une maison : c'est la couleur de sa pastille. */
export function urgency(tasks = []) {
  for (const s of ['blocked', 'waiting', 'active', 'scheduled', 'queued', 'done']) if (tasks.some((t) => t.status === s)) return s
  return 'none'
}

export function eventLine(e, universeName = (x) => x) {
  if (e.type === 'log') return {tone: 'log', title: e.task?.title || e.entry.task, text: e.entry.text}
  const t = e.task
  if (!t) return null
  const where = universeName(t.universe)
  switch (e.type) {
    case 'done': return {tone: 'done', title: t.title, text: `Terminé · ${where}`}
    case 'blocked': return {tone: 'blocked', title: t.title, text: `Bloqué · ${where}`}
    case 'waiting': return {tone: 'waiting', title: t.title, text: `Attend ta décision · ${where}`}
    case 'active': return {tone: 'active', title: t.title, text: `Reprend le travail · ${where}`}
    case 'scheduled': return {tone: 'scheduled', title: t.title, text: `Programmé · ${where}`}
    case 'queued': return {tone: 'queued', title: t.title, text: `Mis en file · ${where}`}
    case 'new': return {tone: t.status, title: t.title, text: `Nouvelle tâche · ${where}`}
    default: return null
  }
}
