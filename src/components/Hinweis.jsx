import React from "react";

/**
 * Rückmeldung nach einer Aktion. Fehler bleiben stehen, bis man sie schließt;
 * Meldungen mit „Rückgängig“ verschwinden von selbst (siehe App).
 */
export function Hinweis({ hinweis, onSchliessen }) {
  if (!hinweis) return null;
  const fehler = hinweis.art === "fehler";

  return (
    <div className={`hinweis ${fehler ? "fehler" : ""}`} role={fehler ? "alert" : "status"}>
      <span>{hinweis.text}</span>
      {hinweis.zurueck && (
        <button
          className="knopf leise"
          onClick={() => {
            hinweis.zurueck();
            onSchliessen();
          }}
        >
          Rückgängig
        </button>
      )}
      <button className="knopf leise" aria-label="Meldung schließen" onClick={onSchliessen}>
        ×
      </button>
    </div>
  );
}
