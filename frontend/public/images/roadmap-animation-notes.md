# Roadmap animation assets

Created with the built-in imagegen tool from `aptis-b2-roadmap.png`.

- `aptis-roadmap-mascot.png`: transparent mascot layer.
- `aptis-roadmap-background.png`: background with mascot removed. Only the small region behind the original mascot is displayed over the original roadmap.
- `aptis-roadmap-neutral.png`: neutral roadmap background used by the dynamic roadmap. The fixed red Listening label is removed and the Listening platform is pink, matching adjacent platforms. Current-stage label, highlight and mascot are positioned by account progress in React.

Cutout prompt: Extract only the candy girl mascot at the center, preserving her identity, pose, proportions and colors. Remove scenery, text, platforms and decorative rays. Use a genuine transparent square background, centered full body with no cropping.

Background prompt: Remove only the candy girl and her decorative rays. Reconstruct the grass and Reading platform behind her. Preserve the roadmap aspect ratio, all Vietnamese text, logo, trophy, scenery, road, stages, and Listening label.

Neutral-background prompt: Remove only the fixed red “Đang học” label and yellow pointer, reconstruct the grass, and change the yellow Listening platform to match the adjacent pink platforms. Preserve all other text, positions, aspect ratio and scenery. Generated with the built-in imagegen tool.

CSS animates the cutout vertically over 2.4 seconds. Reduced-motion preferences disable animation. Both generated assets are saved separately; the original roadmap is preserved.
