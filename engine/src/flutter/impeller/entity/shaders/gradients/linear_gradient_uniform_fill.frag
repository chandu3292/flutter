// Copyright 2013 The Flutter Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

precision mediump float;

#include <impeller/color.glsl>
#include <impeller/dithering.glsl>
#include <impeller/gradient.glsl>
#include <impeller/texture.glsl>
#include <impeller/types.glsl>

uniform FragInfo {
  highp vec2 start_point;
  highp vec2 start_to_end;
  float alpha;
  float tile_mode;
  float colors_length;
  float inverse_dot_start_to_end;
  vec4 decal_border_color;
  vec4 colors[256];
  vec4 stop_pairs[128];
}
frag_info;

highp in vec2 v_position;

out vec4 frag_color;

void main() {
  highp vec2 start_to_position = v_position - frag_info.start_point;
  highp float t = dot(start_to_position, frag_info.start_to_end) *
                  frag_info.inverse_dot_start_to_end;

  if ((t < 0.0 || t > 1.0) && frag_info.tile_mode == kTileModeDecal) {
    frag_color = frag_info.decal_border_color;
  } else {
    t = IPFloatTile(t, frag_info.tile_mode);

    vec2 prev_stop = frag_info.stop_pairs[0].xy;
    bool even = false;
    for (int i = 1; i < frag_info.colors_length; i++) {
      // stop_pairs[i/2].xy = values for stop i
      // stop_pairs[i/2].zw = values for stop i+1
      vec2 cur_stop = even ? frag_info.stop_pairs[i / 2].xy
                           : frag_info.stop_pairs[i / 2].zw;
      even = !even;
      // stop.x == t value
      // stop.y == inverse_delta to next stop
      if (t >= prev_stop.x && t <= cur_stop.x) {
        if (cur_stop.y > 1000.0) {
          frag_color = frag_info.colors[i];
        } else {
          float ratio = (t - prev_stop.x) * cur_stop.y;
          frag_color = mix(frag_info.colors[i - 1], frag_info.colors[i], ratio);
        }
        break;
      }
      prev_stop = cur_stop;
    }
  }

  frag_color = IPPremultiply(frag_color) * frag_info.alpha;
}
