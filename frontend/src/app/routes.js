import { createBrowserRouter } from "react-router";
import Root from "./Root";
import Home from "../pages/Home";
import Dashboard from "../pages/Dashboard";
import Events from "../pages/Events";
import SignIn from "../pages/SignIn";
import Register from "../pages/Register";
import Chat from "../pages/Chat";
import Mood from "../pages/Mood";
import Journal from "../pages/Journal";
import Wellness from "../pages/Wellness";
import Careers from "../pages/Careers";
import Press from "../pages/Press";
import Privacy from "../pages/Privacy";
import Terms from "../pages/Terms";
import Cookies from "../pages/Cookies";
import Crisis from "../pages/Crisis";
import NotFound from "../pages/NotFound";
import AdaptiveMoodCheckin from "../app/components/AdaptiveMoodCheckin";

export const router = createBrowserRouter([
{
  path: "/",
  Component: Root,
  children: [
  { index: true, Component: Home },
  { path: "dashboard", Component: Dashboard },
  { path: "events", Component: Events },
  { path: "signin", Component: SignIn },
  { path: "register", Component: Register },
  { path: "chat", Component: Chat },
  { path: "mood", Component: Mood },
  { path: "journal", Component: Journal },
  { path: "wellness", Component: Wellness },
  { path: "careers", Component: Careers },
  { path: "press", Component: Press },
  { path: "privacy", Component: Privacy },
  { path: "terms", Component: Terms },
  { path: "cookies", Component: Cookies },
  { path: "crisis", Component: Crisis },
  { path: "*", Component: NotFound }]

}]
);
