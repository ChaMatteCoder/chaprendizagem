export const sampledPoints = [
  { x: 0.0, t: -0.9602 },
  { x: 0.1, t: -0.577 },
  { x: 0.2, t: -0.0729 },
  { x: 0.3, t: 0.3771 },
  { x: 0.4, t: 0.6405 },
  { x: 0.5, t: 0.66 },
  { x: 0.6, t: 0.4609 },
  { x: 0.7, t: 0.1336 },
  { x: 0.8, t: -0.2013 },
  { x: 0.9, t: -0.4344 },
  { x: 1.0, t: -0.5 },
];

export function createSampledPointRows() {
  return sampledPoints.map((point, index) => ({
    id: index + 1,
    x: point.x,
    t: point.t,
  }));
}
