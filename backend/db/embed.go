package dbdata

import "embed"

//go:embed *.sql accounts
var Files embed.FS
