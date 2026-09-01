import {useLayoutEffect,useRef} from 'react'
import {registerDraft} from '../../shared/unsaved-changes'
export function useUnsavedChanges(dirty:boolean,pending=false) {
  const state=useRef({dirty,pending})
  state.current={dirty,pending}
  useLayoutEffect(()=>registerDraft(()=>state.current),[])
}
