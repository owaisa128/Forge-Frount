import { cn } from "cn"
import { HugeiconsIcon } from "./hugeicons"
import { Loading03Icon } from "@hugeicons/core-free-icons"

function Spinner({
  className,
  ...props
}) {
  return (
    <HugeiconsIcon icon={Loading03Icon} data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
