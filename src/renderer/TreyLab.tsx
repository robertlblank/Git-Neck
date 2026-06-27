import { useMemo, useState } from "react";
import type { ReactElement } from "react";
import { PITCH_CLASSES } from "../domain/notes";
import {
  TREY_CURRICULUM_WEEKS,
  TREY_LISTENING_ASSIGNMENTS,
  TREY_SOURCE_REFERENCES,
  TREY_TONE_NOTES,
  TREY_VOCABULARY,
  getTreySourceReferences,
  transposeTreyPattern,
  type TreyVocabularyCard
} from "../domain/treyCurriculum";

export function TreyLab(): ReactElement {
  const [selectedCardId, setSelectedCardId] = useState(TREY_VOCABULARY[0]?.id ?? "");
  const [rootPitchClass, setRootPitchClass] = useState(7);
  const selectedCard = TREY_VOCABULARY.find((card) => card.id === selectedCardId) ?? TREY_VOCABULARY[0];
  const noteSequence = useMemo(
    () => transposeTreyPattern(rootPitchClass, selectedCard.intervalPattern),
    [rootPitchClass, selectedCard.intervalPattern]
  );

  return (
    <section className="trey-lab stack">
      <div className="summary-band trey-hero">
        <div>
          <p className="eyebrow">Trey Lab</p>
          <h2>Anastasio vocabulary trainer</h2>
          <p className="summary-note">
            <strong>Original studies, not copied solos.</strong>
            <span>
              The app teaches recurring devices from sourced interviews, rig reporting, and song histories while keeping the actual practice phrases newly written.
            </span>
          </p>
        </div>
        <div className="trey-hero-stats">
          <div>
            <strong>{TREY_VOCABULARY.length}</strong>
            <span>vocabulary cards</span>
          </div>
          <div>
            <strong>{TREY_CURRICULUM_WEEKS.length}</strong>
            <span>week curriculum</span>
          </div>
          <div>
            <strong>{TREY_SOURCE_REFERENCES.length}</strong>
            <span>source set</span>
          </div>
        </div>
      </div>

      <section className="trey-trainer-grid">
        <div className="metric-panel trey-card-list">
          <p className="eyebrow">Top devices</p>
          {TREY_VOCABULARY.map((card) => (
            <button
              className={card.id === selectedCard.id ? "trey-card-button active" : "trey-card-button"}
              key={card.id}
              onClick={() => setSelectedCardId(card.id)}
            >
              <span>{card.title}</span>
              <small>{card.confidence}</small>
            </button>
          ))}
        </div>

        <MotifTrainer
          card={selectedCard}
          noteSequence={noteSequence}
          rootPitchClass={rootPitchClass}
          onRootPitchClassChange={setRootPitchClass}
        />
      </section>

      <section className="metric-grid trey-wide-grid">
        <section className="metric-panel">
          <p className="eyebrow">Practice curriculum</p>
          <div className="trey-week-list">
            {TREY_CURRICULUM_WEEKS.map((week) => (
              <article className="trey-week" key={week.week}>
                <div>
                  <span className="trey-pill">Week {week.week}</span>
                  <h3>{week.title}</h3>
                  <p>{week.goal}</p>
                </div>
                <ul>
                  {week.dailyBlocks.map((block) => (
                    <li key={block}>{block}</li>
                  ))}
                </ul>
                <p className="helper-text">Pass: {week.passCriteria.join(" ")}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="metric-panel">
          <p className="eyebrow">Listening map</p>
          <div className="trey-listening-list">
            {TREY_LISTENING_ASSIGNMENTS.map((assignment) => (
              <article className="trey-listening-card" key={assignment.title}>
                <h3>{assignment.title}</h3>
                <p>{assignment.focus}</p>
                <ul>
                  {assignment.whatToMark.map((marker) => (
                    <li key={marker}>{marker}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section className="metric-panel">
          <p className="eyebrow">Tone notes</p>
          <div className="trey-tone-list">
            {TREY_TONE_NOTES.map((toneNote) => (
              <article className="trey-tone-card" key={toneNote.label}>
                <span className="trey-pill">{toneNote.confidence}</span>
                <h3>{toneNote.label}</h3>
                <p>{toneNote.note}</p>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="metric-panel">
        <p className="eyebrow">Sources</p>
        <div className="trey-source-grid">
          {TREY_SOURCE_REFERENCES.map((source) => (
            <a href={source.url} key={source.id} rel="noreferrer" target="_blank">
              <strong>{source.title}</strong>
              <span>{source.use}</span>
            </a>
          ))}
        </div>
      </section>
    </section>
  );
}

function MotifTrainer(props: {
  card: TreyVocabularyCard;
  noteSequence: string[];
  onRootPitchClassChange: (pitchClass: number) => void;
  rootPitchClass: number;
}): ReactElement {
  const sources = getTreySourceReferences(props.card.sourceIds);

  return (
    <section className="metric-panel trey-motif-panel">
      <div className="trey-motif-header">
        <div>
          <p className="eyebrow">{props.card.confidence}</p>
          <h2>{props.card.title}</h2>
          <p>{props.card.whyItMatters}</p>
        </div>
        <label>
          Root
          <select
            value={props.rootPitchClass}
            onChange={(event) => props.onRootPitchClassChange(Number(event.currentTarget.value))}
          >
            {PITCH_CLASSES.map((pitchClass) => (
              <option key={pitchClass.value} value={pitchClass.value}>
                {pitchClass.displayName}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="trey-sequence" aria-label={`${props.card.title} note sequence`}>
        {props.noteSequence.map((noteName, index) => (
          <div className="trey-note-cell" key={`${noteName}-${index}`}>
            <strong>{noteName}</strong>
            <span>{props.card.patternLabels[index]}</span>
          </div>
        ))}
      </div>

      <div className="trey-detail-grid">
        <div>
          <p className="eyebrow">Core move</p>
          <p>{props.card.coreMove}</p>
        </div>
        <div>
          <p className="eyebrow">Tempo</p>
          <p>
            {props.card.tempoFloorBpm} to {props.card.tempoTargetBpm} bpm
          </p>
        </div>
        <div>
          <p className="eyebrow">Song anchors</p>
          <p>{props.card.songAnchors.join(", ")}</p>
        </div>
      </div>

      <div className="trey-detail-grid">
        <div>
          <p className="eyebrow">Variations</p>
          <ul>
            {props.card.variations.map((variation) => (
              <li key={variation}>{variation}</li>
            ))}
          </ul>
        </div>
        <div>
          <p className="eyebrow">Checkpoints</p>
          <ul>
            {props.card.checkpoints.map((checkpoint) => (
              <li key={checkpoint}>{checkpoint}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="trey-source-row">
        {sources.map((source) => (
          <a href={source.url} key={source.id} rel="noreferrer" target="_blank">
            {source.title}
          </a>
        ))}
      </div>
    </section>
  );
}
