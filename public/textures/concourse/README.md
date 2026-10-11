# CrowdClear concourse assets

Floor, wall, and exterior artwork generated through Higgsfield GPT Image Flare (1K, low quality) from the team-approved asset sheet. Three generations, quoted at 0.75 credits total. Runtime images are local WebP files; the game uses no Higgsfield API or remote image dependency.

| Runtime file | Generation job | Original |
| --- | --- | --- |
| `floor.webp` | `444bc46e-f899-4402-a697-4d2b0703e5b0` | [Floor](https://d8j0ntlcm91z4.cloudfront.net/user_3JVocr5qleRr06WwPVgzOnlSm5p/hf_20261011_033932_444bc46e-f899-4402-a697-4d2b0703e5b0.png) |
| `wall.webp` | `87b11347-7965-427c-8b18-3bfe33dad39f` | [Wall](https://d8j0ntlcm91z4.cloudfront.net/user_3JVocr5qleRr06WwPVgzOnlSm5p/hf_20261011_033932_87b11347-7965-427c-8b18-3bfe33dad39f.png) |
| `exterior.webp` | `43872373-2b92-417b-b423-9b1e3488ed9c` | [Exterior](https://d8j0ntlcm91z4.cloudfront.net/user_3JVocr5qleRr06WwPVgzOnlSm5p/hf_20261011_033932_43872373-2b92-417b-b423-9b1e3488ed9c.png) |

Floor and wall swatches have reduced contrast and mirrored opposite edges for repeating surfaces, checked after compression. The exterior is a distant flat backdrop behind each real doorway opening; it is not a 360-degree environment or walkable geometry.

Hazard stripes, shutter slats, smoke alpha, and venue map are authored SVGs. Door assemblies, equipment cases and trolley, sign housings, walls, bench, and bin are lightweight A-Frame geometry in `public/environment.js`, following the approved references. Door leaves animate separately; labels and state lights are live text and geometry. Smoke uses five camera-facing sprites with one shared texture.

The crowd models remain Kenney Mini Characters (see their separate CC0 license). Asset rendering follows the shared simulation; floor plan and controller targets stay the same. Peripheral fixtures are decorative because the simulation has no general obstacle pathfinding.
