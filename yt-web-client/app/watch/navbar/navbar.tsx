'use client';

import { useEffect, useState } from "react";
import Link from "next/link";
import { User } from "firebase/auth";

import SignIn from "./sign-in";
import styles from "./navbar.module.css";
import { onAuthStateChangedHelper } from "../../firebase/firebase";

function NavBar() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChangedHelper((user) => {
      setUser(user);
    });

    return () => unsubscribe();
  }, []);

  return (
    <nav className={styles.nav}>
      <Link href="/">
        <span className={styles.logoContainer}>
          <img
            className={styles.logo}
            src="/youtube-logo.svg"
            alt="YouTube Logo"
          />
        </span>
      </Link>

      <SignIn user={user} />
    </nav>
  );
}

export default NavBar;
