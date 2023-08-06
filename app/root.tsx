import { cssBundleHref } from "@remix-run/css-bundle";
import type { LinksFunction } from "@remix-run/node";
import Sidebar from "./components/Sidebar";
import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import styles from "./app.css"
import React from "react";

export const links: LinksFunction = () => [
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
  ...[{ rel: "stylesheet", href: styles }]
];


type Link = {
  href: string;
  text: string;
};


class App extends React.Component {

  sidebarLinks: Link[] = [
    { href: "/", text: "Home" },
    { href: "/calibration", text: "Calibration" },
    { href: "/game", text: "Game" },
  ]


  constructor(props: any) {
    super(props)
  }

  render() {

    return (
      <html lang="en">
        <head>
          <meta charSet="utf-8" />
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          <Meta />
          <Links />
        </head>
        <body>
          <div className="App">
            <div className="sidebar">
              <Sidebar links={this.sidebarLinks}/>
            </div>
            <div className="MainContent">
              <Outlet />
            </div>
          </div>
          <ScrollRestoration />
          <Scripts />
          <LiveReload />
        </body>
      </html>
    );
  }
}

export default App;