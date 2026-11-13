// Generated from src/MakerVault.Infrastructure/Sync/SyncTables.cs by the Stage 12 tests. Don't edit by hand.
self.MV_TABLES = [
  {
    "name": "workflows",
    "group": "projects",
    "label": "Project type",
    "key": [
      "id"
    ],
    "natural": [
      "name"
    ],
    "columns": [
      {
        "name": "id",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "name",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "tags",
    "group": "projects",
    "label": "Tag",
    "key": [
      "id"
    ],
    "natural": [
      "name"
    ],
    "columns": [
      {
        "name": "id",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "name",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "projects",
    "group": "projects",
    "label": "Project",
    "key": [
      "id"
    ],
    "natural": null,
    "columns": [
      {
        "name": "id",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "name",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "notes",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "designer",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "source",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "source_url",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "status",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "favorite",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "added_utc",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "updated_utc",
        "rule": "latest",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "illustration",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "is_demo",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "project_workflows",
    "group": "projects",
    "label": "Project type",
    "key": [
      "project_id",
      "workflow_id"
    ],
    "natural": null,
    "columns": [
      {
        "name": "project_id",
        "rule": "ask",
        "ref": "projects",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "workflow_id",
        "rule": "ask",
        "ref": "workflows",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "position",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "project_tags",
    "group": "projects",
    "label": "Project tag",
    "key": [
      "project_id",
      "tag_id"
    ],
    "natural": null,
    "columns": [
      {
        "name": "project_id",
        "rule": "ask",
        "ref": "projects",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "tag_id",
        "rule": "ask",
        "ref": "tags",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "position",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "project_groups",
    "group": "projects",
    "label": "Group",
    "key": [
      "id"
    ],
    "natural": [
      "name_key"
    ],
    "columns": [
      {
        "name": "id",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "name",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "name_key",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "color",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "created_utc",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "project_group_members",
    "group": "projects",
    "label": "Group member",
    "key": [
      "group_id",
      "project_id"
    ],
    "natural": null,
    "columns": [
      {
        "name": "group_id",
        "rule": "ask",
        "ref": "project_groups",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "project_id",
        "rule": "ask",
        "ref": "projects",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "added_utc",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "filaments",
    "group": "filament",
    "label": "Filament",
    "key": [
      "id"
    ],
    "natural": [
      "name_key"
    ],
    "columns": [
      {
        "name": "id",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "material",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "brand",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "colour",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "color_hex",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "diameter_mm",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "notes",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "unopened",
        "rule": "count",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": 0,
        "max": 9999
      },
      {
        "name": "name_key",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "created_utc",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "updated_utc",
        "rule": "latest",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "filament_open_rolls",
    "group": "filament",
    "label": "Open roll",
    "key": [
      "id"
    ],
    "natural": null,
    "columns": [
      {
        "name": "id",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "filament_id",
        "rule": "ask",
        "ref": "filaments",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "position",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "percent_left",
        "rule": "count",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": true,
        "min": 0,
        "max": 100
      }
    ]
  },
  {
    "name": "filament_barcodes",
    "group": "filament",
    "label": "Barcode / tag",
    "key": [
      "code"
    ],
    "natural": null,
    "columns": [
      {
        "name": "code",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "filament_id",
        "rule": "ask",
        "ref": "filaments",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "added_utc",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "filament_roll_grams",
    "group": "filament",
    "label": "Full roll weight",
    "key": [
      "filament_id"
    ],
    "natural": null,
    "columns": [
      {
        "name": "filament_id",
        "rule": "ask",
        "ref": "filaments",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "grams",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "supply_drawers",
    "group": "supplies",
    "label": "Drawer",
    "key": [
      "id"
    ],
    "natural": [
      "name"
    ],
    "columns": [
      {
        "name": "id",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "name",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "note",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "position",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "created_utc",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "supplies",
    "group": "supplies",
    "label": "Supply",
    "key": [
      "id"
    ],
    "natural": null,
    "columns": [
      {
        "name": "id",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "drawer_id",
        "rule": "ask",
        "ref": "supply_drawers",
        "nullable": true,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "name",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "category",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "size",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "quantity",
        "rule": "count",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": 0,
        "max": 1000000
      },
      {
        "name": "warn_below",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "buy_url",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "notes",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "created_utc",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "updated_utc",
        "rule": "latest",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "machines",
    "group": "machines",
    "label": "Machine",
    "key": [
      "id"
    ],
    "natural": null,
    "columns": [
      {
        "name": "id",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "name",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "kind",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "details",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "live_kind",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "live_address",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "position",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "created_utc",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "updated_utc",
        "rule": "latest",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "machine_slots",
    "group": "machines",
    "label": "Machine slot",
    "key": [
      "machine_id",
      "slot"
    ],
    "natural": null,
    "columns": [
      {
        "name": "machine_id",
        "rule": "ask",
        "ref": "machines",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "slot",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "label",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "filament_id",
        "rule": "ask",
        "ref": "filaments",
        "nullable": true,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "supply_uses",
    "group": "supplies",
    "label": "Supplies per print",
    "key": [
      "project_id",
      "supply_id"
    ],
    "natural": null,
    "columns": [
      {
        "name": "project_id",
        "rule": "ask",
        "ref": "projects",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "supply_id",
        "rule": "ask",
        "ref": "supplies",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "per_print",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "print_jobs",
    "group": "printlog",
    "label": "Print",
    "key": [
      "id"
    ],
    "natural": null,
    "columns": [
      {
        "name": "id",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "project_id",
        "rule": "ask",
        "ref": "projects",
        "nullable": true,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "machine_id",
        "rule": "ask",
        "ref": "machines",
        "nullable": true,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "title",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "file_name",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "plates",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "copies",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "outcome",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "percent",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "reason",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "minutes",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "grams",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "source",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "source_key",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "needs_check",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "printed_utc",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "created_utc",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "print_job_filament",
    "group": "printlog",
    "label": "Print filament",
    "key": [
      "job_id",
      "line"
    ],
    "natural": null,
    "columns": [
      {
        "name": "job_id",
        "rule": "ask",
        "ref": "print_jobs",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "line",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "material",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "color_hex",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "grams",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "filament_id",
        "rule": "ask",
        "ref": "filaments",
        "nullable": true,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "print_job_plates",
    "group": "printlog",
    "label": "Printed plate",
    "key": [
      "file_key",
      "plate",
      "job_id"
    ],
    "natural": null,
    "columns": [
      {
        "name": "file_key",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "plate",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "job_id",
        "rule": "ask",
        "ref": "print_jobs",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "print_job_extra",
    "group": "printlog",
    "label": "Print details",
    "key": [
      "job_id"
    ],
    "natural": null,
    "columns": [
      {
        "name": "job_id",
        "rule": "ask",
        "ref": "print_jobs",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "file_path",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "notes",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "took",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "slicer_ids",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "print_job_takes",
    "group": "printlog",
    "label": "Filament taken",
    "key": [
      "job_id",
      "line",
      "seq"
    ],
    "natural": null,
    "columns": [
      {
        "name": "job_id",
        "rule": "ask",
        "ref": "print_jobs",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "line",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "seq",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "filament_id",
        "rule": "ask",
        "ref": "filaments",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "roll_id",
        "rule": "quiet",
        "ref": "filament_open_rolls",
        "nullable": false,
        "soft": true,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "percent",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "opened",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "print_stars",
    "group": "printlog",
    "label": "Starred print",
    "key": [
      "item_key"
    ],
    "natural": null,
    "columns": [
      {
        "name": "item_key",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "starred_utc",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "to_print",
    "group": "printlog",
    "label": "To print",
    "key": [
      "id"
    ],
    "natural": null,
    "columns": [
      {
        "name": "id",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "title",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "file_name",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "file_path",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "plates",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "copies",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "minutes",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "machine_id",
        "rule": "ask",
        "ref": "machines",
        "nullable": true,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "project_id",
        "rule": "ask",
        "ref": "projects",
        "nullable": true,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "note",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "reprint",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "reprint_note",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "from_job_id",
        "rule": "quiet",
        "ref": "print_jobs",
        "nullable": true,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "position",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "created_utc",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "to_print_filament",
    "group": "printlog",
    "label": "To print filament",
    "key": [
      "item_id",
      "line"
    ],
    "natural": null,
    "columns": [
      {
        "name": "item_id",
        "rule": "ask",
        "ref": "to_print",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "line",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "slicer_id",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "material",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "color_hex",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "grams",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "filament_id",
        "rule": "ask",
        "ref": "filaments",
        "nullable": true,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "maintenance_tasks",
    "group": "machines",
    "label": "Maintenance",
    "key": [
      "id"
    ],
    "natural": null,
    "columns": [
      {
        "name": "id",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "machine_id",
        "rule": "ask",
        "ref": "machines",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "name",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "every",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "unit",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "supply_id",
        "rule": "ask",
        "ref": "supplies",
        "nullable": true,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "supply_count",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "last_done_utc",
        "rule": "latest",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "created_utc",
        "rule": "quiet",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  },
  {
    "name": "maintenance_done",
    "group": "machines",
    "label": "Maintenance done",
    "key": [
      "id"
    ],
    "natural": null,
    "columns": [
      {
        "name": "id",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "task_id",
        "rule": "ask",
        "ref": "maintenance_tasks",
        "nullable": true,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "machine_id",
        "rule": "ask",
        "ref": "machines",
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "name",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "done_utc",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      },
      {
        "name": "note",
        "rule": "ask",
        "ref": null,
        "nullable": false,
        "soft": false,
        "percent": false,
        "min": null,
        "max": null
      }
    ]
  }
];
