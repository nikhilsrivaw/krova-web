"use client";

import { createContext, useContext } from "react";

export type WorkspaceAppearance = "default" | "refined";
export const WorkspaceDesign = createContext<WorkspaceAppearance>("default");
export function useWorkspaceAppearance() { return useContext(WorkspaceDesign); }
