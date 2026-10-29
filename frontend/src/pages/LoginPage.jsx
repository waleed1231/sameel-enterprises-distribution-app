import { useState } from "react";
import { Activity, LockKeyhole } from "lucide-react";
import api from "../services/api";
import "./LoginPage.css";

export default function LoginPage({onLogin}) {
  const [username,setUsername]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(false);
  async function submit(e){
    e.preventDefault();setError("");setBusy(true);
    try{
      const {data}=await api.post("/auth/login",{username,password});
      localStorage.setItem("sameel_token",data.token);
      localStorage.setItem("sameel_user",JSON.stringify(data.user));
      onLogin(data.user);
    }catch(err){setError(err.response?.data?.message || "Could not connect to the server. Check that the backend is running.");}
    finally{setBusy(false);}
  }
  return <div className="login-page"><div className="login-art"><div className="login-logo"><Activity size={25}/></div><span className="login-kicker">DISTRIBUTION MANAGEMENT</span><h1>Every order.<br/>Under control.</h1><p>One workspace for pharmaceutical companies, medicine catalogues, stock and order booking.</p><div className="login-art-foot">SAMEEL ENTERPRISES <span>•</span> PAKISTAN</div></div><div className="login-form-side"><form className="login-form" onSubmit={submit}><div className="mobile-brand"><Activity/> Sameel Enterprises</div><span className="eyebrow">PRIVATE STAFF ACCESS</span><h2>Welcome back</h2><p className="muted">Sign in to your distribution workspace.</p>{error&&<div className="alert error">{error}</div>}<label>Username<input autoComplete="username" value={username} onChange={e=>setUsername(e.target.value)} placeholder="Enter your username" required/></label><label>Password<input type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" required/></label><button className="primary full" disabled={busy}>{busy?"Signing in…":<><LockKeyhole size={16}/> Sign in securely</>}</button><div className="login-note">Staff accounts are created by your administrator.</div></form></div></div>;
}
