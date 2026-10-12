// Inner markup of each symbol's 24x24 icon, in the current stroke colour.
// Shared by the page's SVG icons and the 3D drums' textures.

export const ICON_MARKUP: Record<string, string> = {
  sun: "<circle cx=\"12\" cy=\"12\" r=\"4.5\" fill=\"currentColor\" stroke=\"none\" /><path d=\"M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1\" />",
  cloud: "<path d=\"M7 18.5h10a4 4 0 0 0 .6-7.95A5.5 5.5 0 0 0 7 9.6 4.5 4.5 0 0 0 7 18.5z\" fill=\"currentColor\" fill-opacity=\"0.25\" />",
  rain: "<path d=\"M7 14.5h10a3.6 3.6 0 0 0 .5-7.15A5 5 0 0 0 7.6 6.6 4 4 0 0 0 7 14.5z\" fill=\"currentColor\" fill-opacity=\"0.25\" /><path d=\"M8.5 17.5l-1 3M12.5 17.5l-1 3M16.5 17.5l-1 3\" />",
  wind: "<path d=\"M3 9h11a2.5 2.5 0 1 0-2.4-3M3 14h15a2.5 2.5 0 1 1-2.4 3M3 19h7\" />",
  snow: "<path d=\"M12 3v18M4.2 7.5l15.6 9M19.8 7.5l-15.6 9M9.5 4.5L12 7l2.5-2.5M9.5 19.5L12 17l2.5 2.5\" />",
  storm: "<path d=\"M7 13.5h10a3.6 3.6 0 0 0 .5-7.15A5 5 0 0 0 7.6 5.6 4 4 0 0 0 7 13.5z\" fill=\"currentColor\" fill-opacity=\"0.25\" /><path d=\"M12.8 12.5l-3 4.5h3.4l-1.8 4.5\" fill=\"none\" />",
  calm: "<circle cx=\"12\" cy=\"12\" r=\"9\" /><path d=\"M8 14c1 1.7 2.3 2.5 4 2.5s3-.8 4-2.5\" /><path d=\"M8.5 10h.01M15.5 10h.01\" stroke-width=\"2.4\" />",
  curious: "<circle cx=\"12\" cy=\"12\" r=\"9\" /><circle cx=\"9\" cy=\"10\" r=\"1.2\" fill=\"currentColor\" stroke=\"none\" /><circle cx=\"15\" cy=\"10\" r=\"1.2\" fill=\"currentColor\" stroke=\"none\" /><circle cx=\"12\" cy=\"15.5\" r=\"1.6\" />",
  wary: "<circle cx=\"12\" cy=\"12\" r=\"9\" /><path d=\"M7.5 9.5l3 1M16.5 9.5l-3 1\" /><path d=\"M9 16h6\" />",
  hungry: "<circle cx=\"12\" cy=\"12\" r=\"9\" /><path d=\"M8.5 9.5h.01M15.5 9.5h.01\" stroke-width=\"2.4\" /><path d=\"M8 14.5c1.2 3 6.8 3 8 0z\" fill=\"currentColor\" fill-opacity=\"0.25\" />",
  frightened: "<circle cx=\"12\" cy=\"12\" r=\"9\" /><circle cx=\"9\" cy=\"10\" r=\"1.6\" /><circle cx=\"15\" cy=\"10\" r=\"1.6\" /><ellipse cx=\"12\" cy=\"16\" rx=\"2\" ry=\"2.6\" />",
  furious: "<circle cx=\"12\" cy=\"12\" r=\"9\" /><path d=\"M6.5 7.5l4 2M17.5 7.5l-4 2\" /><path d=\"M8.5 11h.01M15.5 11h.01\" stroke-width=\"2.4\" /><path d=\"M8 17c1-2 7-2 8 0\" />",
  gold: "<circle cx=\"12\" cy=\"12\" r=\"8.5\" fill=\"currentColor\" fill-opacity=\"0.25\" /><circle cx=\"12\" cy=\"12\" r=\"5.5\" /><path d=\"M12 9v6M10 10.5h3a1 1 0 0 1 0 1.5h-2a1 1 0 0 0 0 1.5h3\" />",
  gem: "<path d=\"M6 4h12l4 6-10 11L2 10z\" fill=\"currentColor\" fill-opacity=\"0.25\" /><path d=\"M2 10h20M9 4l-2 6 5 11 5-11-2-6\" />",
  potion: "<path d=\"M9.5 3h5M10.5 3v5L5 18a2.5 2.5 0 0 0 2.2 3.5h9.6A2.5 2.5 0 0 0 19 18l-5.5-10V3\" /><path d=\"M7.5 15h9\" />",
  scroll: "<path d=\"M6 4h12a2 2 0 0 1 2 2v1H8v10a2 2 0 0 1-4 0V6a2 2 0 0 1 2-2z\" fill=\"currentColor\" fill-opacity=\"0.25\" /><path d=\"M8 7v10a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1H10M11 10h6M11 13h6\" />",
  relic: "<path d=\"M12 2.5l2.7 5.5 6 .9-4.4 4.2 1 6-5.3-2.8-5.3 2.8 1-6L3.3 8.9l6-.9z\" fill=\"currentColor\" fill-opacity=\"0.25\" />",
  curse: "<path d=\"M12 3a8 8 0 0 0-8 8c0 2.6 1.3 4.4 3 5.4V20h10v-3.6c1.7-1 3-2.8 3-5.4a8 8 0 0 0-8-8z\" fill=\"currentColor\" fill-opacity=\"0.25\" /><path d=\"M9 11h.01M15 11h.01\" stroke-width=\"3\" /><path d=\"M10.5 20v-2.5M13.5 20v-2.5M12 14.5v1\" />",
  cherry: "<circle cx=\"8\" cy=\"16.5\" r=\"3.5\" fill=\"currentColor\" fill-opacity=\"0.35\" /><circle cx=\"16.5\" cy=\"15.5\" r=\"3.5\" fill=\"currentColor\" fill-opacity=\"0.35\" /><path d=\"M8 13C8.5 8 11 5 15 3.5M16.5 12c-.5-4-1.5-6.5-1.5-8.5\" /><path d=\"M15 3.5c2 0 4 1 5 2.5-2 .5-4 0-5-2.5z\" />",
  lemon: "<path d=\"M4 14c0-5 4.5-9 9-9 1.5 0 3 .5 4 1.5 1 1 1.5 2.5 1.5 4 0 4.5-4 9-9 9-2.5 0-5.5-2-5.5-5.5z\" fill=\"currentColor\" fill-opacity=\"0.3\" /><path d=\"M17 6.5l2.5-2.5M7 17l-2.5 2.5\" />",
  bell: "<path d=\"M6 17V11a6 6 0 0 1 12 0v6l1.5 2h-15z\" fill=\"currentColor\" fill-opacity=\"0.3\" /><path d=\"M10 21a2 2 0 0 0 4 0M12 3v2\" />",
  bar: "<rect x=\"3\" y=\"7\" width=\"18\" height=\"10\" rx=\"2\" fill=\"currentColor\" fill-opacity=\"0.3\" /><path d=\"M7 11h10M7 13.5h10\" />",
  seven: "<path d=\"M5 5h14l-8 15M8 12.5h7\" stroke-width=\"2.6\" />",
  diamond: "<path d=\"M12 2.5l8 9.5-8 9.5L4 12z\" fill=\"currentColor\" fill-opacity=\"0.3\" /><path d=\"M4 12h16M12 2.5v19\" />",
}
