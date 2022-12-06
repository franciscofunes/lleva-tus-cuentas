
import Tippy from "@tippyjs/react";
import { React, useState } from "react";
import "tippy.js/dist/tippy.css";

const InfoTooltip = ({
  content,
  isInteractive = true,
  hasInteractiveBorder = 20,
  time = 50,
  placement = "right",
  arrow = true,
}) => {
  const [visible, setVisible] = useState(true);

  const hide = () => setVisible(false);
  const [screenWidth, setScreenWidth] = useState(0);

  useEffect(() => {
    setScreenWidth(window.innerWidth);
  }, []);

  tippy(element, {
    placement: screenWidth > 600 ? "top" : "right",
    duration: screenWidth > 600 ? 1000 : 500,
  });

  return (
    <>
      <Tippy
        content={content}
        placement={placement}
        arrow={arrow}
        interactive={isInteractive}
        interactiveBorder={hasInteractiveBorder}
        delay={time}
        onClickOutside={hide}
        allowHTML={true}
        followCursor={true}
        theme={"translucent"}
      >
        <button onClick={(e) => e.preventDefault()}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 22 22"
            strokeWidth="1.5"
            stroke="#787878"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path stroke="none" d="M0 0h24v24H0z" />
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
            <polyline points="11 12 12 12 12 16 13 16" />
          </svg>
        </button>
      </Tippy>
    </>
  );
};

export default InfoTooltip;

