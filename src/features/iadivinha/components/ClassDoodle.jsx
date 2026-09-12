import { CHARACTER_MOTIONS } from '../lib/characterMotions.js';

export default function ClassDoodle({ kind }) {
  return (
    <svg className="iad-doodle" viewBox="0 0 240 190" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <g className="iad-doodle-reaction">
      {['duck', 'shoe'].includes(kind) && <ellipse className={`iad-ground-shadow iad-shadow-${kind}`} cx="120" cy="179" rx="66" ry="5" fill="currentColor" stroke="none" opacity=".12" />}
      <g className={`iad-character ${CHARACTER_MOTIONS[kind] || ''}`}>
      {kind === 'cat' && <>
        <path fill="#fffdf7" d="M49 83 48 28Q48 17 59 27L88 56Q121 44 152 55L181 25Q190 17 189 32L191 87Q211 116 188 144Q162 169 118 167Q73 167 49 143Q29 119 49 83Z" />
        <path className="iad-cat-ears" stroke="#ff9368" strokeWidth="5" d="m59 43 2 24 14-6m96 0 10 5-1-25" />
        <path d="m28 109 38 3m-37 18 37-6m-25 23 29-12m105-25 36-5m-36 20 38 1m-42 10 31 13" />
        <g className="iad-cat-eyes"><ellipse fill="currentColor" stroke="none" cx="88" cy="99" rx="6" ry="8" /><ellipse fill="currentColor" stroke="none" cx="151" cy="98" rx="6" ry="8" /></g>
        <path fill="currentColor" strokeWidth="3" d="M111 114Q119 110 128 114L120 124Z" /><path strokeWidth="6" d="M120 125q-2 20-17 8m17-8q3 19 16 7" />
      </>}
      {kind === 'duck' && <>
        <path className="iad-duck-foot-left" d="m99 151-6 20m6-5-13 3" /><path className="iad-duck-foot-right" d="m144 151 7 18 14 1" />
        <path fill="#fffdf7" d="M37 99Q58 121 90 113Q137 105 133 80Q125 33 151 28Q179 19 185 51L180 94Q197 140 155 153Q98 173 57 146Q37 133 37 99Z" />
        <path fill="#fffdf7" d="m184 51 32 14q-7 10-33 11" /><ellipse fill="currentColor" stroke="none" cx="161" cy="49" rx="5" ry="7" />
        <path className="iad-duck-wing" strokeWidth="6" d="M79 132q21 13 40-7" />
      </>}
      {kind === 'shoe' && <>
        <path fill="#fffdf7" d="M29 124Q36 104 83 92L129 47Q140 35 146 56Q151 79 174 75Q186 72 190 54Q195 44 200 60L215 123L215 151Q147 174 65 162Q24 160 29 124Z" />
        <path d="M30 130Q73 158 214 123M173 139l1 22" /><path className="iad-shoe-laces" d="M80 93l17 17m1-34 16 19m1-35 16 20" />
      </>}
      {kind === 'bread' && <>
        <g className="iad-aroma" strokeWidth="3" opacity="0"><path d="M91 40q-8-7 0-14t0-14" /><path d="M121 35q-8-7 0-14t0-14" /><path d="M151 40q-8-7 0-14t0-14" /></g>
        <path stroke="#ffe08b" strokeWidth="6" d="m35 54-9-6m29-18-6-12m145 17 7-11m6 30 13-4m-15 101 11 5" />
        <path fill="#fff9e9" d="M30 131Q21 102 61 73Q105 40 160 52Q191 58 204 87Q224 126 176 145Q124 166 69 161Q39 157 30 131Z" />
        <path fill="#cd9146" strokeWidth="5" d="M61 73q26 4 39 36 6 10 4-5-3-24-22-41m24-11q29 7 38 39 5 11 3-4-3-24-18-37m23 0q22 12 26 37 4 9 4-4-2-16-10-25" />
      </>}
      {kind === 'hand' && <>
        <path fill="#fff9e9" d="M89 154 42 112Q29 99 39 89Q49 79 62 90L80 103 66 48Q61 31 74 28Q87 25 91 41L103 78 102 30Q102 13 115 14Q128 14 128 30L128 76 141 33Q146 18 158 24Q169 29 163 44L150 87 170 57Q180 43 191 52Q200 59 190 75L170 111Q163 160 134 168Q108 175 89 154Z" />
        <path strokeWidth="6" d="M91 111q19 0 25 18" /><path stroke="#7660c2" strokeWidth="6" d="m191 124 13-5m-19 24 12 7" />
      </>}
      {kind === 'hot-air-balloon' && <>
        <path fill="#fff9e9" d="M95 129Q47 87 58 56Q68 19 116 18Q163 16 180 51Q198 85 145 129Z" />
        <path fill="#50b3e7" stroke="none" d="M116 22Q66 74 104 126H118Q90 68 116 22m6 0q44 55 15 105h-13q26-61-2-105" />
        <path d="M95 129h50" /><g className="iad-balloon-basket"><path d="m95 129 8 20m17-20v20m25-20-8 20" /><path fill="#fff9e9" d="M99 149h42l-4 23q-17 9-34 0Z" /></g>
        <path stroke="#2671d5" strokeWidth="6" d="m57 127-15-5m18 21-12 9m132-29 15-5m-13 22 12 9" />
      </>}
      {kind === 'airplane' && <>
        <path className="iad-plane-lines" stroke="#258256" strokeWidth="6" d="m50 49-9-12m145 98 14 1m-23 15 10 12" />
        <path fill="#fff9e9" d="m107 69-36-34q-7-8 10-10l51 22 30-15q34-14 47 3 13 17-12 35l-32 19-17 64q-3 12-23 15l2-62-48 15-18 27-13 2 4-30-18 2-7-8 16-12-20-30q-7-12 8-16l33 22Z" />
        <path stroke="#57bc91" strokeWidth="7" d="m93 95 1-1m17-8 1-1m17-8 1-1m18-8 1-1m17-9 1-1m16-13 6-9" />
      </>}
      {kind === 'guitar' && <>
        <path stroke="#ac2e6a" strokeWidth="6" d="m47 68-13-7m26-6-5-16m143 80 13-3m-17 24 13 6" />
        <path fill="#fff9e9" d="M139 83q17 20-3 35-7 6-5 20 3 33-30 39-29 6-51-17-27-27-9-50 10-14 27-13 15 0 15-14 2-31 30-23Z" />
        <path fill="#fff9e9" d="m109 84 52-69 24 18-53 69Z" />
        <path d="m165 17-8-6m18 7 5-6m5 18 9 4m-34-12-8-5m30 28 8 4" strokeWidth="5" />
        <circle cx="105" cy="115" r="16" fill="currentColor" />
        <path className="iad-guitar-strings" strokeWidth="3" d="m81 142 83-110m-78 114 84-110m-79 114 84-110" /><path strokeWidth="8" d="m77 141 19 15" />
        <g className="iad-music-notes" strokeWidth="3" opacity="0"><path d="M37 48V30l12-3v16" /><ellipse cx="33" cy="48" rx="4" ry="3" fill="currentColor" /><ellipse cx="45" cy="43" rx="4" ry="3" fill="currentColor" /><path d="M197 94V72l8 5" /><ellipse cx="193" cy="94" rx="4" ry="3" fill="currentColor" /></g>
      </>}
      </g>
      </g>
    </svg>
  );
}
