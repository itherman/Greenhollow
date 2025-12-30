import { signInWithUsernamePassword, signUpWithUsernamePassword } from "../services/auth/authService";
import { getOrCreateGuestSession, saveSession, type Session } from "../services/auth/session";
import { computeAuthOverlayLayout } from "../core/authOverlayLayout";
import { createOverlayFrame } from "./overlayFrame";
import {
  applyGreenhollowButton,
  applyGreenhollowCard,
  applyGreenhollowInput,
  getGreenhollowTheme,
} from "./greenhollowTheme";

type MountAuthOverlayOptions = {
  onContinue: (session: Session) => void;
};

function el<K extends keyof HTMLElementTagNameMap>(tag: K, attrs?: Record<string, string>) {
  const e = document.createElement(tag);
  if (attrs) for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  return e;
}

export function mountAuthOverlay(opts: MountAuthOverlayOptions) {
  const overlay = createOverlayFrame({
    id: "auth-overlay",
    zIndex: 9999,
    background: "radial-gradient(circle at 50% 40%, rgba(31,91,53,0.45), rgba(11,18,32,0.88))",
    paddingPx: 16,
    minScale: 0.6,
    maxScale: 1.0,
  });

  const card = el("div");
  card.style.textAlign = "center";
  applyGreenhollowCard(card);

  const title = el("div");
  title.textContent = "Greenhollow";
  title.style.letterSpacing = "0.6px";
  title.style.textAlign = "center";
  card.appendChild(title);

  const subtitle = el("div");
  subtitle.textContent = "Enter the woods.";
  subtitle.style.color = getGreenhollowTheme().colors.muted;
  subtitle.style.textAlign = "center";
  card.appendChild(subtitle);

  const msg = el("div");
  msg.style.color = getGreenhollowTheme().colors.danger;
  msg.style.textAlign = "center";
  card.appendChild(msg);

  const username = el("input", { placeholder: "Username" }) as HTMLInputElement;
  applyGreenhollowInput(username);
  username.style.textAlign = "center";
  username.style.width = "100%";
  username.style.maxWidth = "520px";
  username.style.marginLeft = "auto";
  username.style.marginRight = "auto";
  username.style.textAlign = "center";
  username.autocapitalize = "none";
  username.autocomplete = "username";
  username.spellcheck = false;

  const password = el("input", { placeholder: "Password", type: "password" }) as HTMLInputElement;
  applyGreenhollowInput(password);
  password.style.textAlign = "center";
  password.style.width = "100%";
  password.style.maxWidth = "520px";
  password.style.marginLeft = "auto";
  password.style.marginRight = "auto";
  password.autocomplete = "current-password";

  card.appendChild(username);
  card.appendChild(password);

  const row = el("div");
  row.style.display = "flex";
  row.style.gap = "16px";
  row.style.flexWrap = "wrap";
  row.style.alignItems = "stretch";
  row.style.justifyContent = "center";

  function button(label: string) {
    const b = el("button") as HTMLButtonElement;
    b.textContent = label;
    b.style.boxSizing = "border-box";
    b.style.width = "100%";
    return b;
  }

  const signIn = button("Sign in");
  const signUp = button("Sign up");
  const guest = button("Continue as guest");
  applyGreenhollowButton(signIn, "primary");
  applyGreenhollowButton(signUp, "secondary");
  applyGreenhollowButton(guest, "secondary");
  guest.style.borderColor = getGreenhollowTheme().colors.wood0;

  row.appendChild(signIn);
  row.appendChild(signUp);
  row.appendChild(guest);
  card.appendChild(row);

  const note = el("div");
  note.style.color = getGreenhollowTheme().colors.muted;
  note.style.textAlign = "center";
  note.textContent =
    "Guest mode works offline. Login enables cloud features (leaderboard later).";
  card.appendChild(note);

  function applyLayout() {
    const l = computeAuthOverlayLayout(window.innerWidth, window.innerHeight);

    card.style.width = "100%";
    card.style.maxWidth = `${l.cardMaxWidthPx}px`;
    card.style.margin = l.variant === "compact" ? "0 auto" : "0";
    card.style.padding = `${l.cardPaddingPx}px`;

    title.style.fontSize = `${l.titleFontPx}px`;
    title.style.marginBottom = `${l.titleMarginBottomPx}px`;
    subtitle.style.fontSize = `${l.subtitleFontPx}px`;
    subtitle.style.marginBottom = `${l.subtitleMarginBottomPx}px`;
    msg.style.fontSize = `${l.messageFontPx}px`;
    msg.style.marginBottom = `${l.messageMarginBottomPx}px`;

    username.style.fontSize = `${l.fieldFontPx}px`;
    username.style.padding = `${l.fieldPaddingYpx}px ${l.fieldPaddingXpx}px`;
    username.style.width = `${l.fieldWidthPct}%`;
    username.style.marginBottom = `${l.fieldGapPx}px`;

    password.style.fontSize = `${l.fieldFontPx}px`;
    password.style.padding = `${l.fieldPaddingYpx}px ${l.fieldPaddingXpx}px`;
    password.style.width = `${l.fieldWidthPct}%`;
    password.style.marginBottom = `${l.fieldGapPx}px`;

    row.style.flexDirection = l.rowDirection;
    row.style.gap = `${l.rowGapPx}px`;
    row.style.marginTop = "6px";

    [signIn, signUp, guest].forEach((b) => {
      b.style.fontSize = `${l.buttonFontPx}px`;
      b.style.padding = `${l.buttonPaddingYpx}px ${l.buttonPaddingXpx}px`;
      b.style.minWidth = l.buttonMinWidthPx ? `${l.buttonMinWidthPx}px` : "0";
      b.style.width = l.variant === "compact" ? "100%" : "auto";
      b.style.maxWidth = l.variant === "compact" ? "520px" : "none";
      b.style.flex = "0 1 auto";
    });

    if (l.variant === "compact" && l.buttonLayout === "twoPlusOne") {
      // Two buttons side-by-side, with guest below full width.
      row.style.flexWrap = "wrap";
      signIn.style.width = "calc(50% - 6px)";
      signUp.style.width = "calc(50% - 6px)";
      guest.style.width = "100%";
      signIn.style.flex = "1 1 calc(50% - 6px)";
      signUp.style.flex = "1 1 calc(50% - 6px)";
      guest.style.flex = "1 1 100%";
      [signIn, signUp, guest].forEach((b) => (b.style.maxWidth = "none"));
    } else if (l.variant === "compact") {
      // Stacked buttons (less horizontal thinking on portrait).
      row.style.flexWrap = "nowrap";
      [signIn, signUp, guest].forEach((b) => {
        b.style.width = "100%";
        b.style.maxWidth = "520px";
        b.style.flex = "0 1 auto";
      });
    } else {
      row.style.flexWrap = "wrap";
      [signIn, signUp, guest].forEach((b) => {
        b.style.width = "auto";
        b.style.maxWidth = "none";
        b.style.flex = "0 1 auto";
      });
    }

    note.style.fontSize = `${l.noteFontPx}px`;
    note.style.marginTop = `${l.noteMarginTopPx}px`;

    // After internal layout changes, refit the overlay frame so it never requires scroll.
    overlay.update();
  }

  function done(session: Session) {
    saveSession(session);
    window.removeEventListener("resize", applyLayout);
    overlay.destroy();
    opts.onContinue(session);
  }

  guest.onclick = () => {
    done(getOrCreateGuestSession());
  };

  async function doAuth(kind: "signin" | "signup") {
    msg.textContent = "";
    const u = username.value;
    const p = password.value;
    const res =
      kind === "signin"
        ? await signInWithUsernamePassword({ username: u, password: p })
        : await signUpWithUsernamePassword({ username: u, password: p });

    if (!res.ok) {
      msg.textContent =
        res.reason === "invalid_username"
          ? "Invalid username (3-20 chars, a-z/0-9/_; must start with a letter)."
          : res.reason === "username_taken"
            ? "That username is taken."
            : "Login failed (Firebase not configured or wrong credentials).";
      return;
    }

    done({ mode: "firebase", uid: res.uid, username: res.username });
  }

  signIn.onclick = () => void doAuth("signin");
  signUp.onclick = () => void doAuth("signup");

  applyLayout();
  window.addEventListener("resize", applyLayout);

  overlay.frame.appendChild(card);
}


