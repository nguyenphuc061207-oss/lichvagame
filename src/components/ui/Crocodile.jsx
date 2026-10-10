function CrocodileLeg({ front = false }) {
  return (
    <g className={`croc-leg ${front ? "croc-leg-front" : "croc-leg-back"}`}>
      <path
        d={
          front
            ? "M240 126C222 121 214 135 226 143L257 144C267 141 259 134 247 133"
            : "M143 125C128 125 126 138 139 143L173 144C181 141 174 133 162 131"
        }
        fill="var(--croc-skin)"
        stroke="var(--croc-outline)"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d={front ? "M235 138l-2 5M244 139l-1 5" : "M151 138l-2 5M160 139l-1 5"}
        fill="none"
        stroke="var(--croc-outline)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </g>
  );
}

export function Crocodile({ sleeping = false }) {
  return (
    <div
      className={`ultra-crocodile ${sleeping ? "is-sleeping" : "is-hunting"}`}
      data-state={sleeping ? "sleeping" : "hunting"}
    >
      <svg viewBox="0 0 390 190" focusable="false" aria-hidden="true">
        <ellipse cx="191" cy="151" rx="162" ry="12" fill="var(--croc-shadow)" />
        <g className="croc-body">
          <g className="croc-tail">
            <path
              d="M129 107C88 100 48 120 21 98C8 88 12 73 24 61C18 83 38 91 65 85C93 77 120 76 148 95L143 131C93 143 41 133 21 114C54 130 89 121 129 107Z"
              fill="var(--croc-skin)"
              stroke="var(--croc-outline)"
              strokeWidth="2"
            />
            <path
              d="M37 93L42 84L50 92L62 81L70 89L84 78L92 87L105 78L113 89"
              fill="var(--croc-scales)"
            />
          </g>
          <path
            d="M96 112C97 88 130 75 177 77C209 76 237 88 251 105L316 111C338 111 355 114 355 125C354 139 327 147 290 144L230 140C192 155 133 151 105 135Z"
            fill="var(--croc-skin)"
            stroke="var(--croc-outline)"
            strokeWidth="2"
          />
          <path
            d="M113 126C151 137 203 135 239 124L339 126C324 140 284 140 238 134C199 149 143 146 113 136Z"
            fill="var(--croc-belly)"
          />
          <path
            d="M115 86L124 74L137 80L149 68L162 77L176 65L190 78L203 70L215 86L225 82L239 100"
            fill="var(--croc-scales)"
          />
          <g fill="var(--croc-scales)" opacity="0.65">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <path key={i} d={`M${119 + i * 18} 101l5-4 5 4-5 4Z`} />
            ))}
            {[0, 1, 2, 3, 4].map((i) => (
              <circle key={i} cx={130 + i * 18} cy="114" r="2" />
            ))}
          </g>
          <CrocodileLeg />
          <CrocodileLeg front />
          {!sleeping && (
            <>
              <path d="M235 105L352 104L344 126L246 124Z" fill="#604b38" />
              <path
                d="M267 124l5-10 5 10M288 125l5-10 5 10M310 125l5-10 5 10M330 122l4-9 5 9"
                fill="#fff3cc"
              />
            </>
          )}
          <g className="croc-upper-jaw">
            <path
              d="M224 109C213 98 217 81 229 75C228 61 243 53 253 65C265 60 276 69 276 83L333 84C351 84 365 91 365 103C365 110 353 115 338 115L245 116Z"
              fill="var(--croc-skin)"
              stroke="var(--croc-outline)"
              strokeWidth="2"
            />
            <path
              d="M281 88C305 85 341 89 354 96"
              stroke="var(--croc-highlight)"
              strokeWidth="3"
              fill="none"
              strokeLinecap="round"
            />
            {!sleeping && (
              <path
                d="M269 114l5 9 5-9M291 115l5 9 5-9M313 115l5 9 5-9M336 114l4 8 5-8"
                fill="#fff3cc"
              />
            )}
            {sleeping ? (
              <path
                d="M237 78q6 7 12 0M258 80q6 7 12 0"
                stroke="var(--croc-outline)"
                strokeWidth="2.5"
                fill="none"
                strokeLinecap="round"
              />
            ) : (
              <>
                <ellipse cx="243" cy="76" rx="7" ry="9" fill="#fff9e1" />
                <ellipse cx="264" cy="78" rx="7" ry="9" fill="#fff9e1" />
                <ellipse cx="246" cy="77" rx="2.4" ry="5" fill="#283b26" />
                <ellipse cx="267" cy="79" rx="2.4" ry="5" fill="#283b26" />
                <circle cx="247" cy="74" r="1" fill="#fff" />
                <circle cx="268" cy="76" r="1" fill="#fff" />
              </>
            )}
            <ellipse
              cx="345"
              cy="96"
              rx="3"
              ry="2"
              fill="var(--croc-outline)"
            />
            <ellipse
              cx="256"
              cy="100"
              rx="7"
              ry="4"
              fill="#d99a6b"
              opacity="0.35"
            />
            <path
              d="M240 107Q284 120 348 109"
              fill="none"
              stroke="var(--croc-outline)"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </g>
        </g>
        {sleeping ? (
          <g className="croc-sleep">
            {[0, 1, 2].map((i) => (
              <text
                key={i}
                className="croc-snore"
                x="280"
                y="52"
                style={{ animationDelay: `-${i * 1.3}s` }}
                fontSize={12 + i * 4}
              >
                z
              </text>
            ))}
          </g>
        ) : (
          <g className="croc-prey">
            <g transform="translate(335 76) rotate(-28)">
              <g
                className="croc-prey-wings"
                fill="#fffbea"
                fillOpacity="0.8"
                stroke="#89a799"
                strokeWidth="0.6"
              >
                <ellipse
                  cx="-10"
                  cy="-4"
                  rx="13"
                  ry="4"
                  transform="rotate(20 -10 -4)"
                />
                <ellipse
                  cx="10"
                  cy="-4"
                  rx="13"
                  ry="4"
                  transform="rotate(-20 10 -4)"
                />
                <ellipse cx="-9" cy="3" rx="11" ry="3" />
                <ellipse cx="9" cy="3" rx="11" ry="3" />
              </g>
              <path
                d="M0-7L0 19"
                stroke="#518c99"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              <circle cy="-7" r="2.5" fill="#3d717a" />
            </g>
          </g>
        )}
        {sleeping && (
          <g fill="var(--croc-grass)" opacity="0.85">
            <path d="M70 153L65 135L75 145L82 129L80 152Z" />
            <path d="M187 157L181 141L191 151L195 139L198 156Z" />
            <path d="M354 151L350 136L359 145L367 130L364 153Z" />
          </g>
        )}
      </svg>
    </div>
  );
}
