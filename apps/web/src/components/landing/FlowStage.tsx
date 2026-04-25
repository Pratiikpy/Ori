// FlowStage — composes WinChats / WinThread / WinSend in a 3-col grid (lg+),
// stacks below. Heights match to the tallest sibling via h-full on each window.
// Ports Ori-landing.html lines 1347-1494 (#flow / .flow-stage).

import { Reveal, SectionHead, Serif } from '@/components/ui'
import { WinChats } from './WinChats'
import { WinThread } from './WinThread'
import { WinSend } from './WinSend'

export function FlowStage() {
  return (
    <section id="flow" className="shell pt-20 pb-24">
      <Reveal>
        <SectionHead
          eyebrow="02 · Flow"
          title={
            <>
              A single gesture from <Serif>conversation</Serif> to settled.
            </>
          }
          sub="Three surfaces. One continuous thought. Roll your pointer across them."
        />
      </Reveal>
      <div className="mt-14 grid sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-5 items-stretch">
        <WinChats />
        <WinThread />
        <WinSend />
      </div>
    </section>
  )
}
