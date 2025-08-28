// src/firebase/auth.js
import { getAuth } from "firebase/auth";
import { shintoApp } from "./firebase"; // ✅ use shintoApp

export const auth = getAuth(shintoApp); // ✅ initialize auth with shinto app
