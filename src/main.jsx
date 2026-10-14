import React from 'react'
import {createRoot} from 'react-dom/client'
import Dashboard from './Dashboard.jsx'
import './pilot.css'
const Pilot=React.lazy(()=>import('./PilotView.jsx'))
const Map3D=React.lazy(()=>import('./MapView.jsx'))
const Root=()=>{const [h,setH]=React.useState(location.hash);React.useEffect(()=>{const f=()=>setH(location.hash);addEventListener('hashchange',f);return()=>removeEventListener('hashchange',f)},[]);return h==='#pilot'?<React.Suspense fallback={<div>Chargement du campus…</div>}><Pilot/></React.Suspense>:h!=='#dash'?<React.Suspense fallback={<div style={{padding:40,color:'#999'}}>Chargement de la map…</div>}><Map3D/></React.Suspense>:<Dashboard/>}
import './style.css'
createRoot(document.getElementById('root')).render(<Root/>)
