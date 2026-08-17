/**
 * The footballer's poses, as joint angles.
 *
 * The rig in components/ThePlayer.vue is a chain of nested <g> elements, each
 * one rotating about the joint above it — thigh about the hip, shin about the
 * knee, boot about the ankle. So a pose is nothing more than a number per
 * joint, and a move is a tween between two of them. That is the whole reason
 * this is a rig rather than a set of drawings: the same 300 lines of SVG give a
 * juggle, a trap, a knee-up and an overhead kick, and a new move costs a dozen
 * numbers rather than another asset.
 *
 * SIGN CONVENTION. SVG's y axis points down, so a positive `rotate()` turns
 * clockwise on screen. Every limb is drawn hanging straight down from its
 * pivot, which makes the rest pose all-zeros — and means a *negative* angle
 * swings a limb forward, in the direction the player is facing. Read the
 * numbers below with that in mind: the front leg's -95 in `knee` is a knee
 * lifted to the chest, not a leg swung behind.
 *
 * Every angle is relative to the limb above it, which is what makes a knee a
 * knee. It also means the shins run the *opposite* way to the thighs: a knee
 * only bends backwards, so a tucked shin is a positive `shin` against a
 * negative `leg`, and the two partly cancel. Getting this backwards is not a
 * subtle error — a raised thigh with a negative shin is a leg locked straight
 * out at full stretch, which threw the striking boot clean off the side of the
 * drawing and left the ball meeting nothing. If a pose ever looks like a man
 * doing the splits, this is why.
 *
 * The player faces right. Facing left is a scaleX(-1) on the wrapper rather
 * than a second set of numbers — see the `flip` prop.
 */

/** Every joint the rig exposes, in the order they hang off each other. */
export type Joint =
  | 'torso'
  | 'head'
  | 'armB'
  | 'forearmB'
  | 'armF'
  | 'forearmF'
  | 'legB'
  | 'shinB'
  | 'footB'
  | 'legF'
  | 'shinF'
  | 'footF'

export interface Pose {
  /** Degrees per joint. A joint left out of a pose is taken as 0. */
  joints: Partial<Record<Joint, number>>
  /**
   * Whole-body offset, applied to the root group rather than to any joint.
   *
   * Only the airborne moves need it: a bicycle kick is a body rotated most of
   * the way onto its back, and a header is a body that has left the ground.
   * Expressing those as joint angles would mean bending the spine 70 degrees,
   * which is a different move and a worse drawing.
   */
  root?: { x?: number; y?: number; rot?: number }
  /**
   * Where the ball sits in this pose, in the rig's own SVG units, when the
   * player is holding it rather than striking it.
   *
   * In the rig's coordinate space rather than the page's on purpose. The
   * alternative — measuring the boot's on-screen rect every frame and placing a
   * DOM ball over it — has to survive the SVG's own scaling, the section's
   * transforms and whatever the scroll is doing to both, and gets one of those
   * wrong at some viewport width. Ball and boot drawn in one coordinate system
   * cannot drift apart at any size, because there is nothing between them to
   * drift.
   */
  ball?: { x: number; y: number }
}

/**
 * The rig's neutral geometry, in SVG user units. Everything else in this file
 * is expressed as a rotation away from it, and the drawing in ThePlayer.vue is
 * laid out on it, so the two have to agree — these are the numbers to change if
 * the figure is ever redrawn at a different scale.
 */
/**
 * The rig's skeleton, and the proportions it is built on.
 *
 * The figure stands from y=64 (crown) to y=322 (floor), so it is 258 units
 * tall, and everything below is a share of that:
 *
 *   legs   hip 200 → floor 322   122 units   47%
 *   torso  shoulder 124 → hip    76 units    29%
 *   head   64 → 112              48 units    19%
 *
 * The first two are close to a real body's; the head is not, and is not meant
 * to be — a stylised figure this small needs a head you can read a direction
 * from.
 *
 * The legs used to run from a hip at 186, which made them 136 units, or 53% of
 * the height. Six points does not sound like much and it is the whole
 * difference between a footballer and a wading bird: 47% is about where a human
 * hip sits, and every unit past it comes out of the torso, which is why the
 * body looked small at the same time the legs looked long. They are the same
 * observation.
 */
export const RIG = {
  /** Hip: the pivot for the torso and both thighs. */
  hip: [120, 200],
  /** Neck: the head's pivot. */
  neck: [120, 118],
  /** Shoulders, back and front. The arms hang off these. */
  shoulderB: [114, 124],
  shoulderF: [126, 124],
  elbowB: [114, 164],
  elbowF: [126, 164],
  knee: [120, 259],
  ankle: [120, 310],
  /** Where the feet rest. The shadow sits on it and the ball rolls on it. */
  ground: 322,
  /** Segment lengths, which are just the gaps between the joints above. */
  thigh: 59,
  shin: 51,
  /**
   * Where the ball touches the boot, as an offset from the ankle in the boot's
   * own space: forward along the laces, a shade above the surface.
   */
  bootContact: [26, -2],
  /**
   * Ball radius. Feeds `frontFootBall`, so every contact point in the table
   * re-derives itself when this changes — the ball sits on the laces at
   * whatever size it is, with nothing to hand-correct.
   */
  ballR: 22
} as const

const rad = (deg: number) => (deg * Math.PI) / 180

/** Rotates a local offset by `deg`, in SVG's clockwise-positive convention. */
const spin = (x: number, y: number, deg: number): [number, number] => {
  const c = Math.cos(rad(deg))
  const s = Math.sin(rad(deg))
  return [x * c - y * s, x * s + y * c]
}

/**
 * Where the ball sits when it is on the front boot, worked out from the leg
 * rather than guessed at.
 *
 * Hand-authoring a ball coordinate beside a set of joint angles means keeping
 * two descriptions of the same contact in agreement by eye, and they do not
 * stay in agreement: nudge the thigh five degrees to improve the silhouette and
 * the ball is floating a boot's width from the laces. Walking the chain — hip
 * to knee to ankle to laces, each segment rotated by the angles that are
 * actually applied to it — means the contact is a consequence of the pose, so
 * it cannot be wrong for the pose it was asked about.
 *
 * The angles compound down the chain because the rig's groups nest, so the
 * shin's rotation on screen is its own plus the thigh's, and the boot's is
 * those two plus its own.
 */
export function frontFootBall(joints: Partial<Record<Joint, number>>) {
  const t = joints.legF ?? 0
  const s = t + (joints.shinF ?? 0)
  const f = s + (joints.footF ?? 0)

  const [kx, ky] = spin(0, RIG.thigh, t)
  const [ax, ay] = spin(0, RIG.shin, s)
  const [cx, cy] = spin(RIG.bootContact[0], RIG.bootContact[1], f)
  // Clear of the boot along the boot's own normal, so the ball rests on the
  // laces at any angle rather than sinking into a foot that has rolled over.
  const [nx, ny] = spin(0, -RIG.ballR, f)

  return {
    x: RIG.hip[0] + kx + ax + cx + nx,
    y: RIG.hip[1] + ky + ay + cy + ny
  }
}

/**
 * Resting on the turf at the player's front boot. Poses that do not name a ball
 * position inherit this, which is what makes `stand` and the cameo idles agree
 * about where the ball is without repeating the coordinate.
 */
const BALL_AT_FOOT = { x: 158, y: RIG.ground - RIG.ballR }

export const POSES: Record<string, Pose> = {
  /**
   * Neutral. Not quite all-zeros: arms dead against the body reads as a doll,
   * so both hang a few degrees clear and the elbows carry a little bend. This
   * is the pose every cameo returns to once its move has played out.
   */
  stand: {
    joints: {
      torso: 0,
      head: 0,
      armB: 9,
      forearmB: 12,
      armF: -9,
      forearmF: 10,
      legB: 3,
      shinB: 2,
      legF: -3,
      shinF: 2
    },
    ball: BALL_AT_FOOT
  },

  /**
   * The first frame of the page: stood waiting, watching the ball drop in.
   *
   * Barely off `stand`, and that is the point — a figure doing anything at all
   * on the first frame competes with the ball falling, which is the thing the
   * eye is supposed to follow. All this pose has to say is *he has seen it*:
   * the head tips right back, the arms come off the body ready to balance, and
   * the standing knee softens the way it does before you take a touch.
   */
  watch: {
    joints: {
      torso: -4,
      head: -26,
      armB: 16,
      forearmB: 14,
      armF: -15,
      forearmF: 12,
      legB: 5,
      shinB: 6,
      legF: -7,
      shinF: 7,
      footF: -4
    }
  },

  /**
   * The two halves of the hero's keepy-up, tweened back and forth forever.
   *
   * `juggleDown` is the instant after contact — the boot has struck through and
   * is dropping away, the ball is climbing. `juggleUp` is the boot back up to
   * meet it. The ball's own arc is not interpolated between these two: it is
   * tweened separately so it can overshoot the top of the touch, which is what
   * makes it read as thrown rather than as stuck to the foot.
   *
   * The back leg does almost nothing and that is deliberate — a player
   * juggling stands on one leg and everything else is balance. Giving the
   * standing leg a matching swing reads as marching on the spot.
   */
  juggleDown: {
    joints: {
      torso: -3,
      head: -10,
      armB: 22,
      forearmB: -26,
      armF: -24,
      forearmF: -30,
      legB: 5,
      shinB: 4,
      legF: -12,
      shinF: 10,
      footF: -10
    }
  },

  juggleUp: {
    joints: {
      torso: -7,
      head: -13,
      armB: 33,
      forearmB: -36,
      armF: -39,
      forearmF: -44,
      legB: 4,
      shinB: 6,
      legF: -52,
      shinF: 34,
      footF: -16
    }
  },

  /**
   * The two halves of a running stride, alternated to carry him across the
   * hero once he has volleyed the ball away.
   *
   * A run is the one cycle here where the two legs matter equally — everything
   * else in this table is a touch played off one foot with the other merely
   * standing — so these are near mirror images of each other, and the whole
   * cycle is `runA → runB → runA`. Each is a *contact* pose rather than a
   * mid-air one: the leading heel is down, the trailing shin is folded right up
   * behind, which is the shape a stride reads by.
   *
   * Arms swing opposite to the legs. That is not decoration, it is what a run
   * is: without it a figure moving its legs reads as marching. The elbows stay
   * bent hard through the whole cycle, which is the difference between running
   * and walking fast.
   *
   * `root.y` lifts him off the ground, and the two differ so the cycle carries
   * a bob. The bigger lift is on `runB` — the float, where neither foot is
   * really taking his weight.
   */
  runA: {
    root: { y: -3 },
    joints: {
      torso: -9,
      head: -3,
      armB: -40,
      forearmB: -76,
      armF: 38,
      forearmF: -74,
      legB: 28,
      shinB: 70,
      footB: -12,
      legF: -40,
      shinF: 20,
      footF: -10
    }
  },

  runB: {
    root: { y: -9 },
    joints: {
      torso: -9,
      head: -3,
      armB: 36,
      forearmB: -74,
      armF: -42,
      forearmF: -76,
      legB: -44,
      shinB: 22,
      footB: -12,
      legF: 26,
      shinF: 66,
      footF: -10
    }
  },

  /**
   * Facing away, halfway through a turn.
   *
   * Every angle here is the exact negative of its opposite number — `armB` 7
   * against `armF` −7, `legB` 4 against `legF` −4 — and that is the entire
   * point of the pose rather than a tidiness. Mirroring a left-right symmetric
   * figure produces the identical picture, so this is the one moment in the
   * turn where the facing can be flipped and nothing on screen changes.
   *
   * Which is what lets the turn be a real one. Hiding the flip needs somewhere
   * it cannot be seen; the previous attempt squeezed him to a quarter of his
   * width to get that, which is exactly how a flat card rotates and exactly
   * what it looked like. A symmetric pose gives the same cover for free, at
   * full width, while he is doing something a card cannot do — opening out.
   *
   * The limbs are barely bent because they do not need to be: the width of this
   * pose comes from the arms and legs moving *apart*, which is a translation
   * rather than a rotation and lives in SPREAD in ThePlayer.vue. No amount of
   * joint angle can separate two limbs drawn on the same centre line.
   */
  backView: {
    joints: {
      torso: 0,
      head: 0,
      armB: 7,
      forearmB: 5,
      armF: -7,
      forearmF: -5,
      legB: 4,
      shinB: 2,
      footB: 3,
      legF: -4,
      shinF: -2,
      footF: -3
    }
  },

  /**
   * The strike that hands the ball to the page.
   *
   * Leaning back with the front leg swung most of the way through: the shin
   * nearly straight rather than tucked, because a volley is struck with a
   * locked knee and a tucked one reads as another keepy-up. The back leg braces
   * and the arms fly wide as the counterweight, which is what stops the whole
   * figure looking like it is falling over.
   */
  volley: {
    joints: {
      torso: 12,
      head: -16,
      armB: 48,
      forearmB: -52,
      armF: -62,
      forearmF: -18,
      legB: 14,
      shinB: 16,
      legF: -78,
      shinF: 8,
      footF: -22
    }
  },

  /**
   * Selected Work, first half: the leg drawn back.
   *
   * The kicking leg cocks behind him and the standing leg plants, with the arms
   * thrown the opposite way — a strike is a whole body wound up, and a leg that
   * simply swings from standing reads as a nudge. He is watching the ball down
   * onto his foot, which is what the head is doing.
   */
  windUp: {
    joints: {
      torso: -7,
      head: -14,
      armB: -34,
      forearmB: -54,
      armF: 30,
      forearmF: -50,
      legB: -8,
      shinB: 6,
      legF: 38,
      shinF: 52,
      footF: -8
    }
  },

  /**
   * ...and the strike. Contact, and the follow-through through it.
   *
   * The shin is nearly straight against a thigh swung well through — a ball is
   * struck with a locked knee, and a tucked shin is a keepy-up. He leans back
   * off the contact and the arms fly wide as the counterweight, which is the
   * only thing keeping the whole figure from reading as falling forwards.
   */
  kick: {
    joints: {
      torso: 9,
      head: -8,
      armB: 40,
      forearmB: -48,
      armF: -46,
      forearmF: -22,
      legB: 14,
      shinB: 22,
      legF: -62,
      shinF: 6,
      footF: -20
    }
  },

  /**
   * Sole on top of the ball, killing it dead.
   *
   * The one move here that reads best held rather than swung through, which is
   * why the section it belongs to is the one whose rail the ball rolls the
   * whole length of: he traps it, and then it rolls away under his foot.
   *
   * `footF` is positive against a negative shin — toe up, sole down. Every
   * other move in this file points the toe.
   */
  trap: {
    joints: {
      torso: -7,
      head: -18,
      armB: 26,
      forearmB: -32,
      armF: -28,
      forearmF: -36,
      legB: 6,
      shinB: 5,
      legF: -26,
      shinF: 8,
      footF: 22
    }
  },

  /**
   * Experience. A knee-up — the thigh to the chest, ball popped off it.
   *
   * Chosen for this section because the chart hands the ball from card to card
   * in a series of short hops, and a knee-up is the one touch in football that
   * is unmistakably a small vertical pop rather than a pass.
   */
  knee: {
    joints: {
      torso: -5,
      head: -16,
      armB: 42,
      forearmB: -32,
      armF: -46,
      forearmF: -22,
      legB: 2,
      shinB: 4,
      legF: -95,
      shinF: 70,
      footF: -10
    }
  },

  /**
   * Experience, one: the gather.
   *
   * Knees bent, weight down, arms swung behind. A jump that starts from
   * standing reads as a figure being lifted; a jump that starts from a crouch
   * reads as a jump, and the crouch is most of what sells the height that
   * follows. Both legs together — this is a two-footed take-off, which is what
   * you use to head a ball coming straight at you.
   */
  crouch: {
    joints: {
      torso: -19,
      head: -22,
      armB: 44,
      forearmB: -34,
      armF: 38,
      forearmF: -30,
      legB: -19,
      shinB: 41,
      footB: -6,
      legF: -22,
      shinF: 44,
      footF: -6
    }
  },

  /**
   * Two: at the top of the leap, arched back, waiting for it.
   *
   * The lift is `root.y` rather than straightened legs, because a jump is the
   * whole body leaving the ground and no arrangement of joints can raise a hip
   * above where the rig draws it. The legs trail with the heels folded up
   * behind, which is what a body in the air actually does and what stops it
   * reading as a figure standing on tiptoe.
   *
   * The arch is the wind-up for the neck: he is loading the header, not just
   * arriving under it.
   */
  leap: {
    root: { y: -74 },
    joints: {
      torso: -20,
      head: -26,
      armB: 76,
      forearmB: -34,
      armF: -74,
      forearmF: -28,
      legB: 16,
      shinB: 62,
      footB: -10,
      legF: -18,
      shinF: 54,
      footF: -10
    }
  },

  /**
   * Three: contact. The whole arch snaps the other way through the ball.
   *
   * Still airborne — `root.y` barely drops, because a header happens at the top
   * of the jump and not on the way down. What moves is the spine and the neck,
   * which is where a header's power comes from.
   */
  leapHit: {
    root: { y: -66 },
    joints: {
      torso: 14,
      head: 20,
      armB: 52,
      forearmB: -22,
      armF: -50,
      forearmF: -20,
      legB: 26,
      shinB: 48,
      footB: -8,
      legF: -8,
      shinF: 40,
      footF: -8
    }
  },

  /**
   * Skills. Sat on the floor keeping the ball up with both feet — the two
   * halves of it, alternated forever.
   *
   * `root.y` of 105 is the whole seat: it drops the hip from 200 to 305, which
   * is the floor, and the legs then reach *forward* rather than down because
   * the thigh is swung to near horizontal. Every other pose in this table keeps
   * the hip where the rig draws it; this is the only one where the body is not
   * standing on the ground but sitting on it.
   *
   * `torso` is negative, and that is worth stating because the sign is not
   * obvious: the torso vector points *up* from the hip, so the rotation that
   * leans a standing figure forward is the one that takes a seated one's
   * shoulders back over its hands.
   *
   * Only -12 of it, though. At -32 he had his weight right back on the propping
   * arm, which is a man lying down rather than sitting — the reference is
   * upright with a hand planted beside him for balance, not behind him holding
   * him up. Twelve degrees is the difference between resting and reclining.
   *
   * The back arm plants beside him and the front arm rests forward on the
   * thigh.
   *
   * The two big `foot` values are the flex, and they are not a mistake for a
   * pointed toe. A limb's rotation compounds down the chain, so a shin swung to
   * horizontal carries the boot with it — drawn flat at rest, the boot then
   * points at the ceiling and the ball has nothing to sit on. +44 brings the
   * laces back up to meet it, which is what a foot actually does to keep a ball
   * up, and +14 leaves the resting foot with its heel down and toes up, which
   * is what a foot does when you sit with your legs out.
   *
   * Twenty-two degrees between the two legs at the hip rather than the fourteen
   * tried first: they are drawn on the same centre line, so a smaller gap has
   * them overlapping almost exactly and the touch reads as one leg twitching
   * rather than two feet taking turns.
   */
  sitA: {
    root: { y: 105 },
    joints: {
      torso: -12,
      head: 6,
      armB: 22,
      forearmB: 4,
      armF: 32,
      forearmF: -40,
      legB: -82,
      shinB: 2,
      footB: 14,
      legF: -104,
      shinF: 14,
      footF: 44
    }
  },

  sitB: {
    root: { y: 105 },
    joints: {
      torso: -12,
      head: 6,
      armB: 22,
      forearmB: 4,
      armF: 32,
      forearmF: -40,
      legB: -104,
      shinB: 14,
      footB: 44,
      legF: -82,
      shinF: 2,
      footF: 14
    }
  },

  /**
   * Skills. The overhead kick.
   *
   * The showpiece, and it goes here because Skills is where the ball leaves
   * sideways off the edge of the frame rather than arcing to the next section —
   * so this is the one handoff on the page with the room for a big move, and
   * the only one where the ball genuinely gets launched out of shot.
   *
   * Almost all of it is `root.rot`. A bicycle kick is a body turned onto its
   * back in the air, and no amount of spine bend draws that: the joints here
   * only scissor the legs and throw the arms out, and the rotation does the
   * rest. `root.y` lifts him off the turf, because the shadow stays on the
   * ground and the gap between the two is what sells the jump.
   */
  bicycle: {
    // Lifted less than the move really wants. A bicycle kick at full height put
    // his boots a clear head above the rail he launched from, and at cameo
    // scale that stops reading as a jump and starts reading as a figure pasted
    // at the wrong offset — there is no run-up on screen to explain the air.
    root: { rot: -76, y: -46, x: -10 },
    joints: {
      torso: 7,
      head: -8,
      armB: 82,
      forearmB: -44,
      armF: 38,
      forearmF: -34,
      legB: 52,
      shinB: 26,
      footB: -14,
      legF: -70,
      shinF: 16,
      footF: -20
    }
  },

  /**
   * Education & Languages. A header.
   *
   * The wind-up half — arched back, chin up, both heels off the floor. The
   * contact is `headerHit` below, and the pair are played as a snap rather than
   * a scrub: heading is the one touch on this list with no slow version of
   * itself.
   */
  header: {
    // Heels kicked up behind him, which is a *positive* shin against a near-
    // upright thigh: the knee folds backwards and the boot goes with it.
    root: { y: -38 },
    joints: {
      torso: -15,
      head: -24,
      armB: 72,
      forearmB: -30,
      armF: -78,
      forearmF: -26,
      legB: 10,
      shinB: 58,
      legF: -14,
      shinF: 48
    }
  },

  headerHit: {
    root: { y: -30 },
    joints: {
      torso: 9,
      head: 14,
      armB: 54,
      forearmB: -20,
      armF: -58,
      forearmF: -18,
      legB: 16,
      shinB: 46,
      legF: -8,
      shinF: 40
    }
  },

  /**
   * The footer. Flat on his back on the turf, head against the ball, one knee
   * up — the pose at the end of a game rather than the pose at the end of a
   * warm-up.
   *
   * `root.rot` of -90 is the whole of lying down, and it does the work no joint
   * could: the torso vector points up from the hip, so turning it a quarter
   * turn anticlockwise lays the body along the ground with the head to the left
   * and the legs to the right. `root.y` then drops the hip the 102 units from
   * where the rig draws it to where the floor is.
   *
   * Every angle below therefore reads in a *rotated* frame, which is worth
   * knowing before touching one: local "down" is now screen-right. That is why
   * `legF` is negative to raise a knee (it swings the thigh toward what is now
   * up) and why the ankles carry such large numbers — a foot flat on the ground
   * under a knee bent to 95 degrees needs most of that back again.
   *
   * The arms fold across the chest: negative at the shoulder to bring them up
   * off the ground, then most of a right angle at the elbow to bring the hands
   * back onto the stomach.
   */
  lie: {
    root: { rot: -90, y: 102 },
    joints: {
      torso: 6,
      head: 10,
      armB: -25,
      forearmB: 85,
      armF: -30,
      forearmF: 90,
      legB: 6,
      shinB: -4,
      footB: -25,
      legF: -40,
      shinF: 95,
      footF: -50
    }
  },

  /**
   * The footer. Hands on hips, weight on one leg — the pose a player stands in
   * when the game is over. `lie` above is the alternative and is unused.
   *
   * The forearms fold hard back against the upper arms to put the hands on the
   * hips. That is what the near-square `forearm` values are; they are not a
   * mistake for a small bend.
   *
   * A foot up on the ball was the first version of this and is the better
   * drawing, but it cannot be aimed: the ball resting here is the page's, it
   * settles at the midpoint of the footer's rule, and a raised boot that misses
   * it by twenty pixels is a man balancing on nothing. Both feet down always
   * lands.
   *
   * Both feet down is also the *bottom* of a tap, which is what this is now
   * half of — see `restTap`.
   */
  rest: {
    joints: {
      torso: 2,
      head: 5,
      armB: 50,
      forearmB: -96,
      armF: -52,
      forearmF: 98,
      legB: 7,
      shinB: 4,
      legF: -6,
      shinF: 3
    },
    ball: BALL_AT_FOOT
  },

  /**
   * ...and the top of the tap. The front toe up, and nothing else.
   *
   * Everything from the hip up is copied from `rest` unchanged, deliberately
   * and to the degree: a tap is one foot, and any drift in the shoulders, the
   * head or the standing leg turns a man waiting into a man fidgeting. The
   * three numbers that do move are the front thigh, its shin and its ankle, and
   * the ankle carries almost all of it.
   *
   * The toe goes up rather than the heel, which is not a stylistic call — it is
   * the only direction an ankle pivot can afford. The pivot sits eighteen units
   * above the sole, nineteen behind the toe and nineteen in front of the heel,
   * so rolling the boot heel-up drives the toe fourteen units through the floor
   * while toe-up costs six units of heel. Six is also honest: a tap rocks the
   * weight back onto the heel, it does not lift it.
   */
  restTap: {
    joints: {
      torso: 2,
      head: 5,
      armB: 50,
      forearmB: -96,
      armF: -52,
      forearmF: 98,
      legB: 7,
      shinB: 4,
      legF: -9,
      shinF: 7,
      footF: -26
    },
    ball: BALL_AT_FOOT
  }
}

/**
 * Fill in the ball for every pose that holds it on the boot, from the boot.
 *
 * Done here rather than inline in each pose so the poses stay a table of joint
 * angles and nothing else — and so that a pose and its contact point cannot be
 * edited apart. Poses left out of this list are the ones where the ball is not
 * on the front foot at all: a knee-up, an overhead kick and a header all put it
 * somewhere no leg chain can answer for, and none of them is ever played by a
 * figure that draws its own ball.
 */
for (const name of ['juggleDown', 'juggleUp', 'volley', 'trap'] as const) {
  POSES[name].ball = frontFootBall(POSES[name].joints)
}

/**
 * Which move each cameo plays, keyed by the name a section passes in.
 *
 * A single table rather than a prop per section, so the sequence of moves down
 * the page can be read in one place and reordered without touching four
 * components. `enter` is what plays as the ball arrives; `settle` is what he
 * falls back to once it has gone.
 */
export const CAMEOS: Record<
  string,
  {
    enter: string
    settle: string
    hit?: string
    /**
     * A pose before `enter`, for a move that has to be gathered before it is
     * made. A jump needs it; a trap does not.
     */
    prep?: string
    /**
     * Where on his box the ball meets him, as fractions of its width and
     * height. Defaults to the striking boot on the ground line.
     *
     * A tracked move is timed by the ball's distance from this point, so it is
     * the difference between a foot and a head.
     */
    contact?: [number, number]
    /**
     * Time this move off where the ball actually is, rather than off scroll.
     *
     * For a move that makes contact with the ball, which is not the same thing
     * as a move played while the ball goes past. A scrub cannot do it: the ball
     * lays its own windows out at run time from the scroll each stretch of page
     * happens to have (see layout() in TheScrollBall.vue), so a perch's declared
     * trigger is a hint and not a timetable. Measured on this section, a strike
     * placed two thirds through the rule's declared window swung 379px from the
     * ball and the ball did not arrive for another 400px of scroll.
     *
     * Tracking is also the only version that survives a change of viewport,
     * because the thing it keys on is the thing that has to be true.
     */
    track?: boolean
    /**
     * Alternate `enter` and `hit` forever on a clock, rather than playing a
     * move once.
     *
     * For a cameo that is doing something continuous rather than reacting to
     * the ball arriving — keeping it up, in practice. A looping cameo also owns
     * the surface the ball bounces on: see `.p-touch` in ThePlayer.vue.
     */
    loop?: boolean
    /**
     * Idle on a clock, weighted rather than even: held on `enter`, taken up to
     * `hit` and dropped back out of it, forever.
     *
     * `loop` above cannot do this, and the difference is weight rather than
     * pose count. A juggle is symmetric — as long up as down, eased the same
     * both ways, because that is what a ball under a foot does. A tap is not:
     * the toe goes up, drops hard, and the foot then sits there until the next
     * one. Run through an even sine it reads as a foot waving.
     */
    tap?: boolean
    /**
     * Seconds up into `hit` and back down out of it, for a tap. Whatever is
     * left of `period` is the beat between taps, held on `enter`.
     */
    rise?: number
    fall?: number
    /**
     * Where the contact sits in the window, and how much of it the contact
     * takes — both fractions of the whole scrub.
     *
     * Defaults suit a header, which is a snap: nothing about a head meeting a
     * ball has a slow version of itself. A struck ball does — the leg swings
     * through it — and left on the header's timing that swing was over in 55px
     * of scroll, which reads as the thigh teleporting rather than kicking.
     */
    hitAt?: number
    hitDur?: number
    /** Seconds per touch, for a looping cameo. */
    period?: number
    /** How far the ball rises between touches, in rig units. */
    lift?: number
  }
> = {
  // The ball rolls down the rail to his foot, he strikes it, and it drops onto
  // the deck below — so this one is a wind-up and a contact rather than a held
  // shape. `trap` is still in the table above; it is simply not what this
  // section's ball is doing.
  // Scrubbed against the hold rather than tracked off the ball, which is the
  // opposite of what this started as and for a reason the tracking created.
  //
  // Tracking measures the ball's distance from the boot, and that distance is
  // only well behaved while the ball is *approaching*. The moment it is struck
  // it leaves on a crossing, so the gap opens far faster than it closed and the
  // strike is played out at whatever speed the departure happens to have:
  // measured, the thigh went 38° → −21.7° → −54.7° in two frames of scroll,
  // after a wind-up that had taken 400px. A snap, not a motion.
  //
  // The ball here is anchored to the pin's progress anyway (see ProjectsSection),
  // so scrubbing him against the same hold is not a second source of truth —
  // it is the same one, read somewhere it stays smooth.
  // The swing is a fifth of the hold rather than a twelfth, and it starts early
  // enough to be mid-flight when the ball arrives — the perch puts the ball on
  // his boot at 0.72 of the same window (CONTACT_AT in ProjectsSection).
  work: { enter: 'windUp', hit: 'kick', settle: 'stand', hitAt: 0.54, hitDur: 0.28 },
  // The ball is aimed at the top edge of his box — see the perch registered in
  // ExperienceSection — so the contact point is the middle of that edge rather
  // than a boot on the floor.
  experience: {
    prep: 'crouch',
    enter: 'leap',
    hit: 'leapHit',
    settle: 'stand',
    track: true,
    contact: [0.5, 0]
  },
  // Sat down, keeping it up. A loop rather than a move, because this is the one
  // cameo that is not reacting to the ball passing — the ball is *his* for as
  // long as he has it, and he bounces it off the surface he carries.
  skills: {
    enter: 'sitA',
    hit: 'sitB',
    settle: 'sitA',
    loop: true,
    period: 0.82,
    lift: 74
  },
  education: { enter: 'header', settle: 'stand', hit: 'headerHit' },
  // Stood waiting, tapping a foot — and the only cameo on the page with nothing
  // to react to. Every other one is timed off a ball going past; this one's ball
  // has come to rest on the rule beside him and stays there for as long as the
  // page does, so a move keyed to its arrival is a move that plays once and then
  // never again. What is left is what a player does while he waits, which is
  // what the bottom of a page is.
  //
  // 0.78s a tap: quick enough to read as impatience rather than as a stretch,
  // slow enough that the beat between them is visible. Two thirds of that beat
  // is the foot sitting still — see `tap`.
  footer: {
    enter: 'rest',
    hit: 'restTap',
    settle: 'rest',
    tap: true,
    period: 0.78,
    rise: 0.26,
    fall: 0.12
  }
}
