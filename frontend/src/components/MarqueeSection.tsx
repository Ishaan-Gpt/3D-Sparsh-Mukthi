import { useEffect, useState } from "react";

export default function MarqueeSection() {
  const [scrollVal, setScrollVal] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollVal(window.scrollY);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const translation1 = scrollVal * -0.15;
  const translation2 = scrollVal * 0.15;

  const images = [
    { src: "/theme_space.png", label: "Astronomy & Space" },
    { src: "/theme_ocean.png", label: "Marine Biology" },
    { src: "/theme_dinosaur.png", label: "Prehistoric Earth" },
  ];

  const rowItems1 = [...images, ...images, ...images];
  const rowItems2 = [...images, ...images, ...images];

  return (
    <section className="relative w-full bg-white py-24 overflow-hidden border-t border-b border-black/5">
      {/* Title */}
      <div className="text-center mb-16 max-w-2xl mx-auto px-6">
        <span className="text-xs font-semibold text-vermillion uppercase tracking-widest block mb-4">
          Visual Environments
        </span>
        <h2 className="text-4xl md:text-5xl font-heading font-bold text-charcoalText tracking-tight leading-tight">
          Explore magical virtual{" "}
          <span className="font-serif-italic font-normal text-vermillion block sm:inline">
            subject worlds
          </span>
        </h2>
        <p className="text-charcoalText/75 text-sm mt-4 font-heading">
          Dynamic backgrounds change automatically depending on the lesson topic.
        </p>
      </div>

      {/* Marquee Row 1 */}
      <div className="w-full overflow-hidden flex mb-8">
        <div
          className="flex gap-6 transition-transform duration-100 ease-out"
          style={{ transform: `translateX(${translation1}px)` }}
        >
          {rowItems1.map((item, idx) => (
            <div
              key={idx}
              className="relative w-[280px] sm:w-[380px] h-[180px] sm:h-[220px] rounded-3xl overflow-hidden border border-black/10 flex-shrink-0 group shadow-md"
            >
              <img
                src={item.src}
                alt={item.label}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent z-10" />
              <span className="absolute bottom-5 left-6 text-white text-lg font-serif-italic font-semibold z-20">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Marquee Row 2 */}
      <div className="w-full overflow-hidden flex">
        <div
          className="flex gap-6 transition-transform duration-100 ease-out"
          style={{ transform: `translateX(${translation2 - 200}px)` }}
        >
          {rowItems2.map((item, idx) => (
            <div
              key={idx}
              className="relative w-[280px] sm:w-[380px] h-[180px] sm:h-[220px] rounded-3xl overflow-hidden border border-black/10 flex-shrink-0 group shadow-md"
            >
              <img
                src={item.src}
                alt={item.label}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent z-10" />
              <span className="absolute bottom-5 left-6 text-white text-lg font-serif-italic font-semibold z-20">
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
