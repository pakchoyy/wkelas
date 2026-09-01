import test from 'node:test'
import assert from 'node:assert/strict'
import {registerDraft,draftState,mayLeave} from '../src/shared/unsaved-changes.ts'
test('clean pages leave without prompting',()=>{
 assert.equal(mayLeave(()=>{throw Error('unexpected prompt')},()=>{}),true)
})
test('dirty draft can cancel or explicitly discard; successful save removes warning',()=>{
 let state={dirty:true,pending:false};const unregister=registerDraft(()=>state)
 try {
   assert.equal(mayLeave(()=>false,()=>{}),false)
   assert.equal(draftState().dirty,true)
   assert.equal(mayLeave(()=>true,()=>{}),true)
   state={dirty:false,pending:false}
   assert.equal(mayLeave(()=>{throw Error('unexpected prompt')},()=>{}),true)
 } finally {unregister()}
})
test('pending save blocks leaving even when discard would be accepted',()=>{
 const unregister=registerDraft(()=>({dirty:true,pending:true}));let notices=0
 try {assert.equal(mayLeave(()=>{throw Error('must not offer discard')},()=>notices++),false);assert.equal(notices,1)} finally {unregister()}
})
test('unmounted sources no longer block and multiple sources are combined',()=>{
 const first=registerDraft(()=>({dirty:true,pending:false}));const second=registerDraft(()=>({dirty:false,pending:true}))
 assert.deepEqual(draftState(),{dirty:true,pending:true});first()
 assert.deepEqual(draftState(),{dirty:false,pending:true});second()
 assert.deepEqual(draftState(),{dirty:false,pending:false})
})
