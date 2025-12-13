import React from "react";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent } from "../../../../components/ui/card";
import { Separator } from "../../../../components/ui/separator";

const gridCells = Array.from({ length: 17 * 19 }, (_, i) => i);

const navigationSections = [
  {
    title: "General",
    items: [
      { icon: "/lucide-house.svg", label: "Dashboard" },
      { icon: "/lucide-calendar-days.svg", label: "Planner" },
      { icon: "/lucide-images.svg", label: "Gallery" },
    ],
  },
  {
    title: "AI Tools",
    items: [
      { icon: "/lucide-sparkles.svg", label: "Script Lab" },
      { icon: "/lucide-image-plus.svg", label: "Visual Forge" },
      { icon: "/lucide-video.svg", label: "Video Genie" },
      { icon: "/lucide-message-circle-more.svg", label: "AI Chat" },
    ],
  },
  {
    title: "Other",
    items: [
      { icon: "/icon-2.svg", label: "Insight" },
      { icon: "/lucide-users-round.svg", label: "Community" },
      { icon: "/lucide-handshake.svg", label: "Colaboration" },
      { icon: "/lucide-settings.svg", label: "Settings" },
    ],
  },
];

const socialIcons = [
  { bg: "bg-[#f9fafb40]", content: "vector" },
  { bg: "bg-[#ff000040]", content: "youtube" },
  { bg: "bg-[#ec489940]", content: "instagram" },
];

const insightCards = [
  {
    gradient: "from-blue-500 to-cyan-500",
    title: "AI Generated Video: Content Creator Review Skincare",
  },
  {
    gradient: "from-pink-500 to-orange-500",
    title: "AI Generated Video: Content Creator Review Skincare",
  },
];

export const MainContentSection = (): JSX.Element => {
  return (
    <section className="w-[936px] h-[1032px] rounded-[20px] overflow-hidden bg-[linear-gradient(135deg,rgba(32,32,43,1)_50%,rgba(10,10,18,1)_100%)] relative flex-shrink-0">
      <div className="flex flex-wrap items-start justify-center gap-[1px] absolute top-0 left-0 w-full h-full z-0">
        {gridCells.map((index) => (
          <div
            key={index}
            className={`relative w-[54px] h-[54px] border border-solid border-[#2a2a2e40] ${
              index < 17 ? "mt-[-1.00px]" : ""
            }`}
          />
        ))}
      </div>

      <img
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[936px] h-[1016px] z-10"
        alt="Vector"
        src="/vector.svg"
      />

      <div className="absolute top-[116px] left-1/2 -translate-x-1/2 w-[624px] h-[800px] rounded-[14.55px] z-20">
        <nav className="flex flex-col w-[182px] h-[800px] items-center justify-between p-[17.45px] absolute top-0 left-0 bg-neutralselev-2-header-footer-overlay rounded-[14.55px] border-[1.45px] border-solid border-[#2b2b38]">
          <div className="flex flex-col w-[145.45px] items-start gap-[14.55px] relative flex-[0_0_auto]">
            {navigationSections.map((section, sectionIndex) => (
              <React.Fragment key={sectionIndex}>
                <div className="inline-flex flex-col items-start gap-[2.91px] relative flex-[0_0_auto]">
                  <div className="inline-flex items-center justify-center gap-[7.27px] px-[8.73px] py-0 relative flex-[0_0_auto]">
                    <div className="mt-[-0.73px] text-neutralstext-tertiary text-[8.7px] leading-[16.0px] whitespace-nowrap relative w-fit [font-family:'Poppins',Helvetica] font-normal tracking-[0]">
                      {section.title}
                    </div>
                  </div>
                  <Separator className="w-[143.27px] h-px mb-[-0.27px] bg-neutralsline-border" />
                </div>

                {section.items.map((item, itemIndex) => (
                  <Button
                    key={itemIndex}
                    variant="ghost"
                    className="flex w-[145.45px] items-center gap-[5.82px] px-[8.73px] py-[5.82px] h-auto relative flex-[0_0_auto] rounded-[8.73px] hover:bg-neutralselev-1-cards"
                  >
                    <img
                      className="relative w-[17.45px] h-[17.45px]"
                      alt={item.label}
                      src={item.icon}
                    />
                    <span className="relative w-fit [font-family:'Poppins',Helvetica] font-normal text-neutralstext-secondary text-[10.2px] tracking-[0] leading-[16.0px] whitespace-nowrap">
                      {item.label}
                    </span>
                  </Button>
                ))}
              </React.Fragment>
            ))}
          </div>

          <Button
            variant="ghost"
            className="inline-flex items-center gap-[7.27px] p-[5.82px] h-auto relative flex-[0_0_auto] bg-neutralselev-1-cards rounded-[8.73px] hover:bg-neutralselev-1-cards/80"
          >
            <img
              className="relative w-[17.45px] h-[17.45px]"
              alt="Lucide chevron right"
              src="/lucide-chevron-right.svg"
            />
          </Button>
        </nav>

        <Card className="w-[207px] absolute top-[310px] left-[198px] bg-neutralselev-2-header-footer-overlay rounded-[14.55px] border-[1.45px] border-solid border-[#2b2b38]">
          <CardContent className="flex flex-col items-start justify-center gap-[11.64px] p-[11.64px]">
            <div className="flex items-center gap-[11.64px] relative self-stretch w-full flex-[0_0_auto]">
              <div className="inline-flex items-center gap-[7.27px] p-[8.73px] relative flex-[0_0_auto] bg-brand-coreprimary-electric-purple rounded-[8.73px]">
                <img
                  className="relative w-[21.82px] h-[21.82px]"
                  alt="Icon"
                  src="/lucide-calendar-days.svg"
                />
              </div>
              <div className="flex-col items-start gap-[2.91px] flex-1 grow flex relative">
                <h3 className="relative self-stretch mt-[-0.73px] [font-family:'Poppins',Helvetica] font-semibold text-neutralstext-primary text-base tracking-[0] leading-[21.8px]">
                  Planner
                </h3>
                <p className="relative self-stretch [font-family:'Poppins',Helvetica] font-normal text-neutralstext-primary text-[11.6px] tracking-[0] leading-[18.9px]">
                  See today&#39;s plan
                </p>
              </div>
            </div>

            <div className="flex flex-col items-start gap-[5.82px] p-[8.73px] relative self-stretch w-full flex-[0_0_auto] bg-neutralsline-border rounded-[11.64px] border-[1.45px] border-solid border-[#4e5562]">
              <div className="flex items-center justify-between relative self-stretch w-full flex-[0_0_auto]">
                <div className="inline-flex items-start gap-[5.82px] relative flex-[0_0_auto]">
                  {socialIcons.map((icon, index) => (
                    <div
                      key={index}
                      className={`flex w-[26.18px] h-[26.18px] items-center justify-center gap-[5.82px] p-[5.82px] relative ${icon.bg} rounded-[72.73px]`}
                    >
                      {icon.content === "vector" && (
                        <div className="relative w-[13.09px] h-[14.83px] mt-[-0.14px] mb-[-0.14px]">
                          <img
                            className="absolute w-[84.77%] h-[93.92%] top-[3.91%] left-[15.22%]"
                            alt="Vector"
                            src="/vector-18.svg"
                          />
                          <img
                            className="absolute w-[89.12%] h-[90.01%] top-[3.91%] left-[5.43%]"
                            alt="Vector"
                            src="/vector-7.svg"
                          />
                          <img
                            className="absolute w-[94.56%] h-[88.90%] top-0 left-0"
                            alt="Vector"
                            src="/vector-15.svg"
                          />
                        </div>
                      )}
                      {icon.content === "youtube" && (
                        <div className="relative w-[14.55px] h-[10.14px] bg-[url(/vector-6.svg)] bg-[100%_100%]">
                          <img
                            className="absolute w-[25.91%] h-[42.50%] top-[28.33%] left-[40.01%]"
                            alt="Vector"
                            src="/vector-1.svg"
                          />
                        </div>
                      )}
                      {icon.content === "instagram" && (
                        <img
                          className="relative w-[14.55px] h-[14.55px]"
                          alt="Skill icons"
                          src="/skill-icons-instagram-1.svg"
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="inline-flex items-center justify-center gap-[5.82px] px-[7.27px] py-[2.91px] relative flex-[0_0_auto] bg-[#3b82f680] rounded-[72.73px]">
                  <div className="relative w-fit mt-[-0.73px] [font-family:'Poppins',Helvetica] font-medium text-neutralstext-primary text-[10.2px] tracking-[0] leading-[16.0px] whitespace-nowrap">
                    07:00
                  </div>
                </div>
              </div>
              <p className="relative self-stretch [font-family:'Poppins',Helvetica] font-medium text-neutralstext-primary text-[13.1px] tracking-[0] leading-[20.4px]">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="w-[207px] absolute top-[310px] left-[419px] bg-neutralselev-2-header-footer-overlay rounded-[14.55px] border-[1.45px] border-solid border-[#2b2b38]">
          <CardContent className="flex flex-col items-start justify-center gap-[11.64px] p-[11.64px]">
            <div className="flex items-center gap-[11.64px] relative self-stretch w-full flex-[0_0_auto]">
              <div className="inline-flex items-center gap-[7.27px] p-[8.73px] relative flex-[0_0_auto] bg-brand-coreprimary-electric-purple rounded-[8.73px]">
                <img
                  className="relative w-[21.82px] h-[21.82px]"
                  alt="Icon"
                  src="/icon.svg"
                />
              </div>
              <div className="flex-col items-start gap-[2.91px] flex-1 grow flex relative">
                <h3 className="relative self-stretch mt-[-0.73px] [font-family:'Poppins',Helvetica] font-semibold text-neutralstext-primary text-base tracking-[0] leading-[21.8px]">
                  Gallery
                </h3>
                <p className="relative self-stretch [font-family:'Poppins',Helvetica] font-normal text-neutralstext-primary text-[11.6px] tracking-[0] leading-[18.9px]">
                  Collection of Works
                </p>
              </div>
            </div>

            <div className="flex items-center gap-[8.4px] relative self-stretch w-full flex-[0_0_auto]">
              <div className="flex flex-col items-start gap-[8.4px] relative flex-1 grow">
                <div className="flex flex-col h-[110.55px] items-center justify-end relative self-stretch w-full rounded-[8.84px] overflow-hidden bg-gradient-to-br from-purple-500 to-pink-500">
                  <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs">
                    Gallery Preview
                  </div>
                  <div className="flex items-end justify-between p-[5.31px] relative flex-1 self-stretch w-full grow backdrop-blur-[4.42px] backdrop-brightness-[100%] [-webkit-backdrop-filter:blur(4.42px)_brightness(100%)] bg-[linear-gradient(180deg,rgba(0,0,0,0)_67%,rgba(0,0,0,0.5)_100%)]">
                    <div className="inline-flex items-center gap-[3.54px] relative flex-[0_0_auto]">
                      <img
                        className="relative w-[13.27px] h-[13.27px] object-cover"
                        alt="Ellipse"
                        src="/ellipse-2.png"
                      />
                      <span className="relative w-fit [font-family:'Poppins',Helvetica] font-medium text-neutralstext-primary text-[7.1px] tracking-[0] leading-[11.5px] whitespace-nowrap">
                        Salsabila Putri
                      </span>
                    </div>
                    <div className="inline-flex items-center gap-[3.54px] relative flex-[0_0_auto]">
                      <img
                        className="relative w-[10.61px] h-[10.61px]"
                        alt="Lucide heart"
                        src="/lucide-heart.svg"
                      />
                      <span className="relative w-fit mt-[-0.44px] [font-family:'Poppins',Helvetica] font-medium text-neutralstext-primary text-[7.1px] tracking-[0] leading-[11.5px] whitespace-nowrap">
                        33.3K
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="w-[428px] absolute top-[516px] left-[198px] bg-neutralselev-2-header-footer-overlay rounded-[14.55px] border-[1.45px] border-solid border-[#2b2b38]">
          <CardContent className="flex flex-col items-start justify-center gap-[11.64px] p-[11.64px]">
            <div className="flex items-center gap-[11.64px] relative self-stretch w-full flex-[0_0_auto]">
              <div className="inline-flex items-center gap-[7.27px] p-[8.73px] relative flex-[0_0_auto] bg-brand-coreprimary-electric-purple rounded-[8.73px]">
                <img
                  className="relative w-[21.82px] h-[21.82px]"
                  alt="Icon"
                  src="/icon-2.svg"
                />
              </div>
              <div className="flex-col items-start gap-[2.91px] flex-1 grow flex relative">
                <h3 className="relative self-stretch mt-[-0.73px] [font-family:'Poppins',Helvetica] font-semibold text-neutralstext-primary text-base tracking-[0] leading-[21.8px]">
                  Insight
                </h3>
                <p className="relative self-stretch [font-family:'Poppins',Helvetica] font-normal text-neutralstext-primary text-[11.6px] tracking-[0] leading-[18.9px]">
                  Find patterns and trends
                </p>
              </div>
            </div>

            <div className="inline-flex items-center gap-[7.89px] relative flex-[0_0_auto]">
              {insightCards.map((card, index) => (
                <Card
                  key={index}
                  className="flex flex-col w-[196.78px] items-start gap-[7.43px] p-[7.43px] bg-neutralselev-1-cards rounded-[9.29px] border-0"
                >
                  <CardContent className="p-0 flex flex-col gap-[7.43px] w-full">
                    <div
                      className={`relative self-stretch w-full h-[121.25px] rounded-[7.43px] bg-gradient-to-br ${card.gradient} flex items-center justify-center text-white/20 text-[10px]`}
                    >
                      Video Preview
                    </div>
                    <p className="relative flex items-center justify-center self-stretch [font-family:'Poppins',Helvetica] font-medium text-white text-[7.4px] tracking-[0] leading-[12.1px]">
                      {card.title}
                    </p>
                    <div className="flex items-start justify-between relative self-stretch w-full flex-[0_0_auto]">
                      <div className="inline-flex items-start gap-[3.72px] relative flex-[0_0_auto]">
                        {socialIcons.map((icon, iconIndex) => (
                          <div
                            key={iconIndex}
                            className={`flex w-[16.72px] h-[16.72px] items-center justify-center gap-[3.72px] p-[3.72px] relative ${icon.bg} rounded-[46.44px]`}
                          >
                            {icon.content === "vector" && (
                              <div className="relative w-[8.36px] h-[9.47px] mt-[-0.09px] mb-[-0.09px] overflow-hidden">
                                <img
                                  className="absolute w-[84.77%] h-[95.76%] top-[3.99%] left-[15.23%]"
                                  alt="Vector"
                                  src="/vector-3.svg"
                                />
                                <img
                                  className="absolute w-[89.12%] h-[91.77%] top-[3.99%] left-[5.47%]"
                                  alt="Vector"
                                  src="/vector-7.svg"
                                />
                                <img
                                  className="absolute w-[94.56%] h-[90.63%] top-0 left-0"
                                  alt="Vector"
                                  src="/vector-10.svg"
                                />
                              </div>
                            )}
                            {icon.content === "youtube" && (
                              <div className="relative w-[9.29px] h-[6.5px] bg-[url(/vector-6.svg)] bg-[100%_100%]">
                                <img
                                  className="absolute w-[25.91%] h-[42.69%] top-[28.46%] left-[40.00%]"
                                  alt="Vector"
                                  src="/vector-2.svg"
                                />
                              </div>
                            )}
                            {icon.content === "instagram" && (
                              <img
                                className="relative w-[9.29px] h-[9.29px]"
                                alt="Skill icons"
                                src="/skill-icons-instagram.svg"
                              />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="inline-flex items-center gap-[7.43px] relative flex-[0_0_auto]">
                        <div className="relative w-[27.86px] h-[27.86px] mt-[-0.20px] bg-[url(/ellipse-10.svg)] bg-[100%_100%]">
                          <img
                            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-7 h-7"
                            alt="Ellipse"
                            src="/ellipse-11.svg"
                          />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[13px] flex items-center justify-center [font-family:'Poppins',Helvetica] font-medium text-neutralstext-primary text-[8.4px] tracking-[0] leading-[13.0px] whitespace-nowrap">
                            90
                          </div>
                        </div>
                        <div className="inline-flex flex-col items-start relative flex-[0_0_auto]">
                          <div className="items-center justify-center w-fit mt-[-0.46px] [font-family:'Poppins',Helvetica] font-semibold text-white text-[10.2px] tracking-[0] leading-[13.9px] whitespace-nowrap flex relative">
                            🔥
                          </div>
                          <div className="relative flex items-center justify-center w-fit [font-family:'Poppins',Helvetica] font-medium text-white text-[7.4px] tracking-[0] leading-[12.1px] whitespace-nowrap">
                            Viral
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="w-[428px] h-[297px] absolute top-1/2 -translate-y-1/2 top-[calc(50%-401px)] left-[198px] bg-neutralselev-2-header-footer-overlay rounded-[14.55px] border-[1.45px] border-solid border-[#2b2b38]">
          <CardContent className="flex flex-col items-start justify-center gap-[11.64px] p-[11.64px] h-full">
            <div className="flex items-center gap-[11.64px] relative self-stretch w-full flex-[0_0_auto]">
              <div className="inline-flex items-center gap-[7.27px] p-[8.73px] relative flex-[0_0_auto] bg-brand-coreprimary-electric-purple rounded-[8.73px]">
                <img
                  className="relative w-[21.82px] h-[21.82px]"
                  alt="Icon"
                  src="/icon-1.svg"
                />
              </div>
              <div className="flex-col items-start gap-[2.91px] flex-1 grow flex relative">
                <h3 className="relative self-stretch mt-[-0.73px] [font-family:'Poppins',Helvetica] font-semibold text-neutralstext-primary text-base tracking-[0] leading-[21.8px]">
                  Script Lab
                </h3>
                <p className="relative self-stretch [font-family:'Poppins',Helvetica] font-normal text-neutralstext-primary text-[11.6px] tracking-[0] leading-[18.9px]">
                  Create something new
                </p>
              </div>
            </div>

            <div className="flex items-start gap-[17.45px] p-[17.45px] relative flex-1 self-stretch w-full grow bg-neutralsline-border rounded-[11.64px] border-[1.45px] border-solid border-[#4e5562]">
              <div className="flex flex-col items-start justify-center gap-[5.82px] relative flex-1 grow">
                <div className="relative self-stretch mt-[-0.73px] [font-family:'Poppins',Helvetica] font-medium text-neutralstext-secondary text-[11.6px] tracking-[0] leading-[18.9px]">
                  Script
                </div>
                <p className="relative self-stretch [font-family:'Poppins',Helvetica] font-medium text-neutralstext-primary text-[13.1px] tracking-[0] leading-[20.4px]">
                  Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                  do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                  Ut enim ad minim veniam, quis nostrud exercitation ullamco
                  laboris nisi ut aliquip ex ea commodo.
                </p>
              </div>
              <div className="inline-flex flex-col items-start gap-[5.82px] relative self-stretch flex-[0_0_auto]">
                <div className="relative w-fit mt-[-0.73px] [font-family:'Poppins',Helvetica] font-medium text-neutralstext-secondary text-[11.6px] tracking-[0] leading-[18.9px] whitespace-nowrap">
                  Image
                </div>
                <div className="relative flex-1 w-[103.52px] grow rounded-[5.82px] bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center text-white/20 text-[8px]">
                  Script Image
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};
