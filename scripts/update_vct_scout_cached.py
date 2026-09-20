#!/usr/bin/env python3
"""Run the VCT scout refresh with a shared series-info cache."""

from functools import lru_cache

import vlrdevapi

import update_vct_scout


# Detailed composition parsing asks for series metadata once per map row. A series
# can contain several maps and can appear for both Champions teams, so cache the
# callable for the lifetime of this refresh run.
vlrdevapi.team.stats._series_info = lru_cache(maxsize=512)(vlrdevapi.team.stats._series_info)


if __name__ == "__main__":
    update_vct_scout.main()
