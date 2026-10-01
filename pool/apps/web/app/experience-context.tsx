'use client';
import {createContext,useContext} from 'react';
import type {Presentation,Product,Journey,Action} from '../lib/presentation';
export type Role='buyer'|'seller'|'ops';
export type Modal={kind:string;id?:string}|null;
export type ExperienceContext={state:Presentation;role:Role;route:string;setState:(fn:(s:Presentation)=>Presentation)=>void;go:(route:string)=>void;switchRole:(role:Role,route?:string)=>void;modal:(m:Modal)=>void;act:(id:string,action:Action,fields?:Partial<Journey>)=>boolean;toast:(text:string)=>void;t:(en:string,te?:string,hi?:string)=>string;product:(id:string)=>Product;};
export const Experience=createContext<ExperienceContext|null>(null);
export function useExperience(){const value=useContext(Experience);if(!value)throw Error('Experience context missing');return value;}
