"use client";

import React from "react";
import { ConfigProvider, theme as antdTheme } from "antd";

/**
 * The khata palette, expressed as Ant Design design tokens - not antd's
 * default blue Material-ish look. Scoped locally (wrap only the page that
 * opts into antd) rather than applied at the root layout: v6 scopes its
 * CSS variables to the ConfigProvider's own subtree, so every other page
 * stays exactly as it is today, untouched. Colors pulled directly from
 * app/globals.css's own token comments - brass is the stamp/primary
 * accent, thread is exclusively overdue/rejected, seal is exclusively
 * confirmed/approved. Keep this mapping, don't invent new semantics here.
 */
const krovaAntdTheme = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    colorPrimary: "#C9973F", // brass
    colorInfo: "#C9973F",
    colorSuccess: "#5B8A72", // seal
    colorWarning: "#D0A548",
    colorError: "#B5473D", // thread
    colorBgBase: "#121212", // os-bg
    colorBgContainer: "#1A1A1A", // os-card
    colorBgLayout: "#121212",
    colorBgElevated: "#1A1A1A",
    colorText: "#ECE9E1", // os-ink
    colorTextSecondary: "#B5B2C2",
    colorTextTertiary: "#8F8F8F", // os-text-dim
    colorBorder: "#2B2B2B", // os-border
    colorBorderSecondary: "#2B2B2B",
    borderRadius: 12,
    fontFamily: "var(--font-inter), ui-sans-serif, system-ui, sans-serif",
    fontFamilyCode: "var(--font-jetbrains-mono), ui-monospace, monospace",
  },
  components: {
    Card: {
      colorBgContainer: "#1A1A1A",
      borderRadiusLG: 16,
    },
    Statistic: {
      titleFontSize: 12,
    },
    Tag: {
      borderRadiusSM: 6,
    },
  },
};

export function KrovaAntdTheme({ children }: { children: React.ReactNode }) {
  return <ConfigProvider theme={krovaAntdTheme}>{children}</ConfigProvider>;
}
