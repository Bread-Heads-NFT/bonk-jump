import { DeepPartial, NO_DIFF } from "../../api/base";
import * as T from "../../api/types";

function patchInputs(obj: T.Inputs, patch: DeepPartial<T.Inputs>) {
  if (patch.horizontal !== NO_DIFF) {
    obj.horizontal = patch.horizontal;
  }
  if (patch.vertical !== NO_DIFF) {
    obj.vertical = patch.vertical;
  }
  return obj;
}

function patchPlayer(obj: T.Player, patch: DeepPartial<T.Player>) {
  if (patch.id !== NO_DIFF) {
    obj.id = patch.id;
  }
  if (patch.x !== NO_DIFF) {
    obj.x = patch.x;
  }
  if (patch.y !== NO_DIFF) {
    obj.y = patch.y;
  }
  return obj;
}

function patchPlatform(obj: T.Platform, patch: DeepPartial<T.Platform>) {
  if (patch.x !== NO_DIFF) {
    obj.x = patch.x;
  }
  if (patch.y !== NO_DIFF) {
    obj.y = patch.y;
  }
  if (patch.width !== NO_DIFF) {
    obj.width = patch.width;
  }
  return obj;
}

function patchStar(obj: T.Star, patch: DeepPartial<T.Star>) {
  if (patch.x !== NO_DIFF) {
    obj.x = patch.x;
  }
  if (patch.y !== NO_DIFF) {
    obj.y = patch.y;
  }
  return obj;
}

function patchPlayerState(obj: T.PlayerState, patch: DeepPartial<T.PlayerState>) {
  if (patch.players !== NO_DIFF) {
    obj.players = patchArray(obj.players, patch.players, (a, b) => patchPlayer(a, b));
  }
  if (patch.platforms !== NO_DIFF) {
    obj.platforms = patchArray(obj.platforms, patch.platforms, (a, b) => patchPlatform(a, b));
  }
  if (patch.star !== NO_DIFF) {
    obj.star = patchStar(obj.star, patch.star);
  }
  if (patch.startTime !== NO_DIFF) {
    obj.startTime = patchOptional(obj.startTime, patch.startTime, (a, b) => b);
  }
  if (patch.finishTime !== NO_DIFF) {
    obj.finishTime = patchOptional(obj.finishTime, patch.finishTime, (a, b) => b);
  }
  return obj;
}

function patchArray<T>(arr: T[], patch: typeof NO_DIFF | any[], innerPatch: (a: T, b: DeepPartial<T>) => T) {
  if (patch === NO_DIFF) {
    return arr;
  }
  patch.forEach((val, i) => {
    if (val !== NO_DIFF) {
      if (i >= arr.length) {
        arr.push(val as T);
      } else {
        arr[i] = innerPatch(arr[i], val);
      }
    }
  });
  if (patch.length < arr.length) {
    arr.splice(patch.length);
  }
  return arr;
}

function patchOptional<T>(obj: T | undefined, patch: any, innerPatch: (a: T, b: DeepPartial<T>) => T) {
  if (patch === undefined) {
    return undefined;
  } else if (obj === undefined) {
    return patch as T;
  } else {
    return innerPatch(obj, patch);
  }
}

export function computePatch(state: T.PlayerState, patch: DeepPartial<T.PlayerState>) {
  return patchPlayerState(state, patch);
}
