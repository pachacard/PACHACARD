"use client";
import { signOut } from "next-auth/react";
export default function LogoutButton(){ return <button className="btn btn-primary" onClick={()=>signOut({callbackUrl:"/login"})}>Salir</button>; }
