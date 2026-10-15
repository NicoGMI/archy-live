import React from 'react'
import {createRoot} from 'react-dom/client'
import Dashboard from './Dashboard.jsx'
import './pilot.css'
// A deployment can replace a lazy chunk while an older tab is still open.
addEventListener('vite:preloadError',event=>{const key='archy-preload-retry',last=Number(sessionStorage.getItem(key)||0);if(Date.now()-last>30000){event.preventDefault();sessionStorage.setItem(key,String(Date.now()));location.reload()}})
const Pilot=React.lazy(()=>import('./PilotView.jsx'))
const Diagnostics=React.lazy(()=>import('./Diagnostics.jsx'))
const Map3D=React.lazy(()=>import('./MapView.jsx'))
const Root=()=>{const [h,setH]=React.useState(location.hash);React.useEffect(()=>{const f=()=>setH(location.hash);addEventListener('hashchange',f);return()=>removeEventListener('hashchange',f)},[]);return h==='#diagnostics'?<React.Suspense fallback={<div>Chargement des diagnostics…</div>}><Diagnostics/></React.Suspense>:h==='#pilot'?<React.Suspense fallback={<div>Chargement du campus…</div>}><Pilot/></React.Suspense>:h!=='#dash'?<React.Suspense fallback={<div style={{padding:40,color:'#999'}}>Chargement de la map…</div>}><Map3D/></React.Suspense>:<Dashboard/>}
import './style.css'
createRoot(document.getElementById('root')).render(<Root/>)
