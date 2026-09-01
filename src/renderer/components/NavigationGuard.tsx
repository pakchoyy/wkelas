import {useCallback,useEffect} from 'react'
import {useBlocker} from 'react-router-dom'
import {draftState,mayLeave} from '../../shared/unsaved-changes'
export default function NavigationGuard() {
  const blocker=useBlocker(useCallback(({currentLocation,nextLocation}) => {
    if(currentLocation.pathname===nextLocation.pathname && currentLocation.search===nextLocation.search && currentLocation.hash===nextLocation.hash)return false
    return !mayLeave(message=>window.confirm(message),message=>window.alert(message))
  },[]))
  useEffect(()=>{if(blocker.state==='blocked')blocker.reset()},[blocker])
  useEffect(()=>{
    const warn=(event:BeforeUnloadEvent)=>{const state=draftState();if(state.dirty || state.pending){event.preventDefault();event.returnValue=''}}
    window.addEventListener('beforeunload',warn)
    return()=>window.removeEventListener('beforeunload',warn)
  },[])
  return null
}
