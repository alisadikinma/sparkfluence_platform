import { EyeIcon } from "lucide-react";
import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";

const socialButtons = [
  {
    icon: "/material-icon-theme-google.svg",
    label: "Google",
    alt: "Material icon theme",
  },
  {
    icon: null,
    label: "Tiktok",
    alt: "Tiktok",
    customIcon: true,
  },
  {
    icon: "/skill-icons-instagram-2.svg",
    label: "Instagram",
    alt: "Skill icons",
  },
];

export const SidebarSection = (): JSX.Element => {
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate("/dashboard");
  };

  return (
    <section className="flex w-[400px] h-[545px] relative flex-col items-center justify-center gap-8 flex-shrink-0">
      <header className="flex flex-col w-full max-w-[317px] items-center gap-2 relative flex-[0_0_auto]">
        <div className="inline-flex h-[45px] items-center gap-3 relative">
          <img
            className="relative w-9 h-9 object-cover"
            alt="Logo image"
            src="/image copy copy copy copy copy.png"
          />

          <h1 className="relative flex items-center justify-center w-fit font-h4-web font-[number:var(--h4-web-font-weight)] text-neutralstext-primary text-[length:var(--h4-web-font-size)] tracking-[var(--h4-web-letter-spacing)] leading-[var(--h4-web-line-height)] whitespace-nowrap [font-style:var(--h4-web-font-style)]">
            SPARKFLUENCE
          </h1>
        </div>

        <p className="relative self-stretch font-body-m-regular font-[number:var(--body-m-regular-font-weight)] text-neutralstext-primary text-[length:var(--body-m-regular-font-size)] text-center tracking-[var(--body-m-regular-letter-spacing)] leading-[var(--body-m-regular-line-height)] [font-style:var(--body-m-regular-font-style)]">
          Sign in to continue your AI creation!
        </p>
      </header>

      <div className="flex flex-col items-center gap-6 relative self-stretch w-full flex-[0_0_auto]">
        <form onSubmit={handleLogin} className="flex flex-col items-start gap-10 relative self-stretch w-full flex-[0_0_auto]">
          <div className="flex flex-col items-start gap-4 relative self-stretch w-full flex-[0_0_auto]">
            <div className="flex-col items-start gap-2 flex relative self-stretch w-full flex-[0_0_auto]">
              <Label className="relative flex items-start self-stretch font-body-m-regular font-[number:var(--body-m-regular-font-weight)] text-white text-[length:var(--body-m-regular-font-size)] tracking-[var(--body-m-regular-letter-spacing)] leading-[var(--body-m-regular-line-height)] [font-style:var(--body-m-regular-font-style)]">
                Email
              </Label>

              <Input
                type="email"
                placeholder="Enter your email address"
                className="items-center gap-3 p-3 bg-neutralselev-1-cards rounded-lg border border-solid border-[#4e5562] flex relative self-stretch w-full flex-[0_0_auto] font-other-caption-regular font-[number:var(--other-caption-regular-font-weight)] text-neutralstext-secondary text-[length:var(--other-caption-regular-font-size)] tracking-[var(--other-caption-regular-letter-spacing)] leading-[var(--other-caption-regular-line-height)] [font-style:var(--other-caption-regular-font-style)] h-auto"
              />
            </div>

            <div className="flex-col items-start gap-2 flex relative self-stretch w-full flex-[0_0_auto]">
              <Label className="relative flex items-start self-stretch font-body-m-regular font-[number:var(--body-m-regular-font-weight)] text-white text-[length:var(--body-m-regular-font-size)] tracking-[var(--body-m-regular-letter-spacing)] leading-[var(--body-m-regular-line-height)] [font-style:var(--body-m-regular-font-style)]">
                Password
              </Label>

              <div className="items-center gap-3 p-3 bg-neutralselev-1-cards rounded-lg border border-solid border-[#4e5562] flex relative self-stretch w-full flex-[0_0_auto]">
                <Input
                  type="password"
                  placeholder="Enter your password"
                  className="items-center justify-center flex-1 font-other-caption-regular font-[number:var(--other-caption-regular-font-weight)] text-neutralstext-secondary text-[length:var(--other-caption-regular-font-size)] tracking-[var(--other-caption-regular-letter-spacing)] leading-[var(--other-caption-regular-line-height)] flex relative [font-style:var(--other-caption-regular-font-style)] border-0 bg-transparent p-0 h-auto focus-visible:ring-0 focus-visible:ring-offset-0"
                />

                <EyeIcon className="relative w-6 h-6 text-neutralstext-secondary" />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="flex h-12 items-center justify-center gap-3 px-4 py-3 relative self-stretch w-full bg-brand-coreprimary-electric-purple rounded-lg hover:bg-brand-coreprimary-electric-purple/90"
          >
            <span className="relative w-fit font-other-caption-medium font-[number:var(--other-caption-medium-font-weight)] text-neutralstext-primary text-[length:var(--other-caption-medium-font-size)] tracking-[var(--other-caption-medium-letter-spacing)] leading-[var(--other-caption-medium-line-height)] whitespace-nowrap [font-style:var(--other-caption-medium-font-style)]">
              Login
            </span>
          </Button>
        </form>

        <p className="relative self-stretch font-other-caption-regular font-[number:var(--other-caption-regular-font-weight)] text-neutralstext-primary text-[length:var(--other-caption-regular-font-size)] text-center tracking-[var(--other-caption-regular-letter-spacing)] leading-[var(--other-caption-regular-line-height)] [font-style:var(--other-caption-regular-font-style)]">
          Or
        </p>

        <div className="flex items-center justify-between gap-2 relative self-stretch w-full flex-[0_0_auto]">
          {socialButtons.map((button, index) => (
            <Button
              key={index}
              variant="secondary"
              className="inline-flex h-12 items-center justify-center gap-3 px-4 py-3 relative flex-1 bg-neutralstext-primary rounded-lg hover:bg-neutralstext-primary/90"
            >
              {button.customIcon ? (
                <div className="relative w-6 h-[27.19px]">
                  <img
                    className="absolute w-[84.77%] h-[95.76%] top-[3.99%] left-[15.22%]"
                    alt="Vector"
                    src="/vector-5.svg"
                  />

                  <img
                    className="absolute w-[89.12%] h-[91.77%] top-[3.99%] left-[5.44%]"
                    alt="Vector"
                    src="/vector-7.svg"
                  />

                  <img
                    className="absolute w-[94.56%] h-[90.63%] top-0 left-0"
                    alt="Vector"
                    src="/vector-13.svg"
                  />
                </div>
              ) : (
                <img
                  className="relative w-6 h-6"
                  alt={button.alt}
                  src={button.icon}
                />
              )}

              <span className="relative w-fit font-other-caption-medium font-[number:var(--other-caption-medium-font-weight)] text-neutralsbg-app-background text-[length:var(--other-caption-medium-font-size)] tracking-[var(--other-caption-medium-letter-spacing)] leading-[var(--other-caption-medium-line-height)] whitespace-nowrap [font-style:var(--other-caption-medium-font-style)]">
                {button.label}
              </span>
            </Button>
          ))}
        </div>

        <div className="inline-flex items-center gap-2 relative flex-[0_0_auto]">
          <p className="relative w-fit font-body-m-regular font-[number:var(--body-m-regular-font-weight)] text-neutralstext-primary text-[length:var(--body-m-regular-font-size)] text-center tracking-[var(--body-m-regular-letter-spacing)] leading-[var(--body-m-regular-line-height)] whitespace-nowrap [font-style:var(--body-m-regular-font-style)]">
            Don&#39;t have an account yet ?
          </p>

          <button
            type="button"
            onClick={() => navigate("/register")}
            className="text-brand-coreprimary-electric-purple text-base text-center leading-4 relative w-fit [font-family:'Poppins',Helvetica] font-normal tracking-[0]"
          >
            <span className="font-[number:var(--body-m-medium-font-weight)] text-violet-600 leading-[var(--body-m-medium-line-height)] underline font-body-m-medium [font-style:var(--body-m-medium-font-style)] tracking-[var(--body-m-medium-letter-spacing)] text-[length:var(--body-m-medium-font-size)]">
              Register
            </span>
          </button>
        </div>
      </div>
    </section>
  );
};
