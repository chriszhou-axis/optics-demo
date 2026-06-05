# M12 Dome Camera Focus Demo

[中文说明](./README.ch.md)

This is a pure frontend, dependency-free interactive optics demo for observing how an M12 wide-angle camera lens behaves when a dome cover is placed in front of it, especially in terms of image sharpness, focus position, sensor blur, and thermal focus drift.

The current demo is based on a fixed sensor plane plus a thin-lens approximation, aimed at camera visualization rather than a generic magnifier sketch. The UI supports both Chinese and English.

## 1. Current Lens Specification

- Nominal focal length: 2.8 mm
- Aperture: F2.0
- Field of view: 99° horizontal / 74° vertical
- Minimum focus distance: 1 m
- Mount: M12, fixed iris
- Pixel pitch: 2.0 um

## 2. Current Features

- Displays the subject, lens, dome cover, refracted rays, image plane, and sensor plane on the main canvas
- Lets you drag the subject to observe image changes at different object distances
- Lets you drag the lens to observe focus distance and image-plane movement
- Includes a sensor preview panel to make blur and sharpness changes easier to see
- Supports lens-follow-cursor mode with adjustable follow strength
- Simulates thermal focus drift caused by lens temperature changes
- Separates parameters into "Lens Tuning" and "Real Dome Influence"
- Supports Chinese and English UI switching
- Shows live readouts for focal length, focus shift, blur, and sharpness

## 3. Page Structure

The page is divided into a left-side visualization area and a right-side control area.

The left canvas includes:

- Subject: the target object being observed
- Refracted rays: illustrative rays passing through the lens and affected by the dome
- Dome cover: the physical dome shell placed in front of the lens
- Image plane: the actual image plane for the current object distance
- Sensor plane: the fixed sensor location
- Sensor preview: a magnified preview at the top-right for easier blur inspection
- Focus travel: a bottom focus-travel bar showing the current focus position within the available range

The right control area is split into 5 parts:

- Camera Lens: fixed lens specification
- Lens Tuning: lens tuning parameters
- Real Dome Influence: dome-related parameters
- Interaction: interaction behavior and reset button
- Live Readout: real-time computed results

## 4. Control Description

### 4.1 Camera Lens

This section shows fixed lens specification only and is not interactive.

### 4.2 Lens Tuning

- Lens power bias: adjusts effective optical power and shifts effective focal length and focus position
- Lens aberration bias: adjusts lens aberration tendency and affects off-axis blur
- Lens temperature: simulates temperature-driven sensor-side focus shift

### 4.3 Real Dome Influence

- Dome tilt: simulates dome installation tilt, introducing optical-axis shift and asymmetric error
- Dome-to-lens gap: simulates the spacing between the dome and lens front, affecting extra dome-induced error
- Scene depth span: sets the far scene range used for the visible depth span from 1 m to the far limit
- Ray count: controls how many illustrative rays are drawn on screen

### 4.4 Interaction

- Lens follow cursor: when enabled, the lens follows pointer motion with the configured strength
- Follow amount: controls the amount of lens-follow movement
- Reset Scene: restores the default state

### 4.5 Language Switch

A language dropdown in the page header switches between Chinese and English.

## 5. Live Readout Meaning

- Subject distance: current distance between the subject and the lens
- Focus set distance: focus distance implied by the current lens position
- Effective focal length: effective focal length after lens bias is applied
- Thermal focus shift: effective sensor-side focus shift caused by temperature change
- Optical axis shift: image shift introduced by dome tilt and related asymmetry
- Dome edge penalty: extra penalty term caused by dome edge and off-axis error
- Sensor blur circle: estimated blur circle on the sensor plane
- Sharpness: sharpness level estimated from total blur
- Mode: current interaction state, such as idle, dragging subject, dragging lens, or lens-follow mode

## 6. Interaction Behavior

### 6.1 Dragging the Subject

In the current version, the subject does not automatically follow the mouse. It must be repositioned by dragging.

### 6.2 Dragging the Lens

The lens is dragged to adjust the focus setting. Its movement no longer reaches an infinity singularity and is constrained to a finite focus range.

### 6.3 Lens Follow Mode

When Lens follow cursor is enabled, lens motion includes an additional pointer-driven follow behavior on top of normal dragging.

## 7. Model Notes

This is a simplified model for interactive visualization. It is meant to show trends clearly, not to serve as a physically exact optical simulation.

Core ideas:

1. A thin-lens approximation is used to compute image distance from effective focal length and object distance.
2. The sensor plane is fixed, while dragging the lens changes the effective focus setting.
3. Dome tilt, gap, and off-axis conditions introduce extra image-plane shift, edge penalty, and asymmetric error.
4. The temperature term changes the effective sensor position and produces thermal defocus.
5. Blur in the preview panel is amplified relative to pixel pitch so that subtle blur changes remain visible for a short focal length wide-angle lens.

## 8. Main Code References

In `app.js`, the main parameters and outputs come from:

- `LENS_SPEC`: fixed lens specification constants
- `defaults`: default control values
- `computeOptics()`: core optics approximation and derived values
- `drawDomeCover()`: dome shell rendering
- `drawPreview()`: sensor preview rendering
- `drawFocusTravel()`: bottom focus-travel bar rendering
- `translations` / `setLanguage()`: bilingual UI logic

## 9. Run Locally

This project does not require Node.js or a build tool.

From the project root, run:

```bash
python3 -m http.server 8123
```

Then open:

```text
http://localhost:8123
```

## 10. File Structure

```text
focus-demo/
├── index.html      # page structure and controls
├── styles.css      # layout, theme, responsive rules, and bilingual font settings
├── app.js          # optics logic, drawing, interaction, and language switching
├── README.ch.md    # Chinese project documentation
└── README.en.md    # English project documentation
```

## 11. Known Limits

- This is not a strict optical design tool and does not replace software such as Zemax or Code V
- The dome influence is still a simplified trend model and does not yet include full material dispersion, thickness distribution, or complete refraction-surface solving
- The sensor preview intentionally exaggerates visible blur for readability and does not represent a literal image-plane display scale

## 12. Possible Extensions

- Add dome material refractive-index presets
- Add dome thickness and curvature-radius parameters
- Add more subject types or test-chart modes
- Add more realistic approximations for astigmatism, coma, and field curvature
- Add screenshot export or parameter presets
