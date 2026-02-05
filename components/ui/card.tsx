import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

type CardProps<T extends ElementType = "article"> = {
    as?: T;
    className?: string;
    headerClassName?: string;
    bodyClassName?: string;
    title?: string;
    titleAs?: ElementType;
    titleClassName?: string;
    leading?: ReactNode;
    actions?: ReactNode;
    header?: ReactNode;
    summary?: ReactNode;
    collapsible?: boolean;
    defaultOpen?: boolean;
    showToggle?: boolean;
    children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function Card<T extends ElementType = "article">({
    as,
    className,
    headerClassName,
    bodyClassName,
    title,
    titleAs,
    titleClassName,
    leading,
    actions,
    header,
    summary,
    collapsible = false,
    defaultOpen = true,
    showToggle = true,
    children,
    ...rest
}: CardProps<T>) {
    const Component = as ?? "article";
    const TitleTag = titleAs ?? "h3";

    const headerContent = header ?? (
        title || leading || actions ? (
            <div className={headerClassName ?? "flex items-start justify-between gap-3"}>
                <div className="min-w-0">
                    {leading}
                    {title && <TitleTag className={titleClassName}>{title}</TitleTag>}
                </div>
                {actions}
            </div>
        ) : null
    );

    if (collapsible) {
        return (
            <details className={`group w-full self-start ${className ?? ""}`} defaultOpen={defaultOpen} {...rest}>
                <summary
                    className={`cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden ${headerClassName ?? "flex items-start justify-between gap-3"}`}
                >
                    {summary ?? (
                        <>
                            <div className="min-w-0">
                                {leading}
                                {title && <TitleTag className={titleClassName}>{title}</TitleTag>}
                            </div>
                            {showToggle && (
                                <span className="rounded-full border border-white/20 px-3 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-white/70 transition hover:border-rose-200 hover:text-white">
                                    <span className="group-open:hidden">Expand</span>
                                    <span className="hidden group-open:inline">Minimize</span>
                                </span>
                            )}
                        </>
                    )}
                </summary>
                {children && <div className={bodyClassName}>{children}</div>}
            </details>
        );
    }

    return (
        <Component className={className} {...rest}>
            {headerContent}
            {children && <div className={bodyClassName}>{children}</div>}
        </Component>
    );
}
