# dayone-companion
Expanding on the functionality of the DayOne Journal App

## Overview
This app is designed to import various document formats into DayOne journal entries while preserving as much metadata as possible.

Currently Supported File Types
- pdf
- rtf
- txt
- doc
- pages
- htm
- html
- docx
- png
- jpg
- jpeg

### Build Instructions
To build the project download the repo and run `npm install`. You will need pandoc installed to support Word Documents. You can install the Pandoc CLI with `brew install pandoc` or at this url https://github.com/jgm/pandoc/releases/download/1.17.2/pandoc-1.17.2-osx.pkg.


Reading the instructions will prove most helpful. The command line interface (CLI) that DayOne has put out is very limited and it's important to follow a process to get your entries in correctly.

This tool is designed to help you import files in various formats into DayOne while preserving as much meta-data as possible including dates, titles, and tags.

I highly recommend using DayOne 2 for importing these entries.

**Follow these steps:**
- Before importing entries it's helpful to
- If you're using DayOne 2 start by creating a new journal called "Import" and move this journal to the top of your journals list.
	- Entries imported via the CLI will by default be added to the top journal in your list. By adding your entries in bathes to a staging journal you can add tags to all the entries and review dates and other information for accuracy before dragging them into the journal they belong in.
- It's helpful to work on a specific group of entries at a time. Pick a group of fi
