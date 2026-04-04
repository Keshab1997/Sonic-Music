
import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      closeButton={true}
      toastOptions={{
        duration: 3500,
        classNames: {
          toast:
            "group toast flex items-start gap-3 w-full sm:max-w-[420px] p-4 rounded-xl border shadow-2xl backdrop-blur-lg transition-all duration-300 animate-in slide-in-from-top " +
            "group-[.toaster]:bg-background/95 group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg " +
            "sm:group-[.toaster]:bg-background sm:group-[.toaster]:border sm:group-[.toaster]:shadow-xl",
          title: "text-sm font-semibold leading-none tracking-tight",
          description: "mt-1.5 text-xs text-muted-foreground leading-relaxed",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
          success: "group-[.toaster]:border-green-500/50 group-[.toaster]:bg-green-500/5 dark:group-[.toaster]:bg-green-500/10",
          error: "group-[.toaster]:border-red-500/50 group-[.toaster]:bg-red-500/5 dark:group-[.toaster]:bg-red-500/10",
          warning: "group-[.toaster]:border-yellow-500/50 group-[.toaster]:bg-yellow-500/5 dark:group-[.toaster]:bg-yellow-500/10",
          info: "group-[.toaster]:border-blue-500/50 group-[.toaster]:bg-blue-500/5 dark:group-[.toaster]:bg-blue-500/10",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };

