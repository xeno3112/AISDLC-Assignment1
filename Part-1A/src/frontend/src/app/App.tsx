import { useEffect, useState } from "react";
import {
  archiveTicket,
  closeTicket,
  type TicketView,
} from "../api/tickets.js";
import { TicketDetailPage } from "../features/tickets/TicketDetailPage.js";
import { TicketForm } from "../features/tickets/TicketForm.js";
import { TicketListPage } from "../features/tickets/TicketListPage.js";

type Route =
  | { kind: "queue"; view: TicketView }
  | { kind: "new" }
  | { kind: "ticket"; reference: string }
  | { kind: "notFound" };

export function App() {
  const [hash, setHash] = useState(window.location.hash);
  const [refreshSignal, setRefreshSignal] = useState(0);
  const [createdNotice, setCreatedNotice] = useState("");

  useEffect(() => {
    const handleHashChange = () => setHash(window.location.hash);
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const route = parseRoute(hash);
  const activeView = route.kind === "queue" ? route.view : undefined;

  function handleCreated(reference: string): void {
    setCreatedNotice(`Ticket ${reference} was created.`);
    setRefreshSignal((value) => value + 1);
    window.location.hash = "#/open";
  }

  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to content
      </a>
      <header className="site-header">
        <a className="brand" href="#/open">
          <span aria-hidden="true" className="brand-mark">
            SD
          </span>
          <span>Support Desk</span>
        </a>
        <nav aria-label="Ticket views" className="primary-nav">
          <a
            aria-current={activeView === "open" ? "page" : undefined}
            href="#/open"
          >
            Open
          </a>
          <a
            aria-current={activeView === "assigned" ? "page" : undefined}
            href="#/assigned"
          >
            Assigned
          </a>
          <a
            aria-current={activeView === "archived" ? "page" : undefined}
            href="#/archived"
          >
            Archived
          </a>
        </nav>
        <a className="button button-primary new-ticket-link" href="#/new">
          New ticket
        </a>
      </header>

      <main className="page-container" id="main-content" tabIndex={-1}>
        {route.kind === "queue" && (
          <TicketListPage
            key={route.view}
            view={route.view}
            refreshSignal={refreshSignal}
            notice={createdNotice}
            onNoticeDismiss={() => setCreatedNotice("")}
          />
        )}
        {route.kind === "new" && <TicketForm onCreated={handleCreated} />}
        {route.kind === "ticket" && (
          <TicketDetailPage
            reference={route.reference}
            onClose={closeTicket}
            onArchive={archiveTicket}
          />
        )}
        {route.kind === "notFound" && (
          <section aria-labelledby="not-found-heading" className="panel">
            <h1 id="not-found-heading">Page not found</h1>
            <p>This link does not match a ticket desk page.</p>
            <a href="#/open">Return to the Open queue</a>
          </section>
        )}
      </main>
      <footer className="site-footer">
        <p>Internal support and operations ticket desk</p>
      </footer>
    </div>
  );
}

function parseRoute(hash: string): Route {
  const route = hash.replace(/^#/, "");
  if (route === "" || route === "/" || route === "/open") {
    return { kind: "queue", view: "open" };
  }
  if (route === "/assigned") return { kind: "queue", view: "assigned" };
  if (route === "/archived") return { kind: "queue", view: "archived" };
  if (route === "/new") return { kind: "new" };

  const ticketRoute = /^\/tickets\/(TKT-[A-Fa-f0-9]{24})$/.exec(route);
  if (ticketRoute?.[1]) {
    return { kind: "ticket", reference: ticketRoute[1].toUpperCase() };
  }
  return { kind: "notFound" };
}
