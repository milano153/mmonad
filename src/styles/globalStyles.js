import styled from "styled-components";

// Used for wrapping a page component
export const Screen = styled.div`
  background-color: var(--background);
  background-image: ${({ image }) => (image ? `url(${image})` : "none")};
  background-size: cover;
  background-position: center;
  width: 100%;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

// Used for providing space between components
export const SpacerXSmall = styled.div`
  height: 8px;
  width: 8px;
`;

// Used for providing space between components
export const SpacerSmall = styled.div`
  height: 16px;
  width: 16px;
`;

// Used for providing space between components
export const SpacerMedium = styled.div`
  height: 24px;
  width: 24px;
`;

// Used for providing space between components
export const SpacerLarge = styled.div`
  height: 32px;
  width: 32px;
`;

export const SpacerLargeX = styled.div`
  height: 50px;
  width: 50px;
`;

export const SpacerLargeSX = styled.div`
  height: 75px;
  width: 75px;
`;

export const SpacerLargeXX = styled.div`
  height: 100px;
  width: 100px;
`;

export const SpacerLargeXXX = styled.div`
  height: 300px;
  width: 300px;
`;

// Used for providing a wrapper around a component
export const Container = styled.div`
  display: flex;
  flex: ${({ flex }) => (flex ? flex : 0)};
  flex-direction: ${({ fd }) => (fd ? fd : "column")};
  justify-content: ${({ jc }) => (jc ? jc : "flex-start")};
  align-items: ${({ ai }) => (ai ? ai : "flex-start")};
  background-color: ${({ test }) => (test ? "pink" : "none")};
  width: 100%;
  background-image: ${({ image }) => (image ? `url(${image})` : "none")};
  background-size: cover;
  background-position: center;
`;

export const Container2 = styled.div`
  display: flex;
  flex: ${({ flex }) => (flex ? flex : 0)};
  flex-direction: ${({ fd }) => (fd ? fd : "column")};
  justify-content: ${({ jc }) => (jc ? jc : "flex-start")};
  align-items: ${({ ai }) => (ai ? ai : "flex-start")};
  background-color: ${({ test }) => (test ? "pink" : "none")};
  width: 100%;
  background-image: ${({ image }) => (image ? `url(${image})` : "none")};
  background-size: cover;
  background-position: center;
`;

export const navBar = styled.div`
  display: flex;
  width: 100%;
`;


export const TextTitle = styled.p`
font-family:  "Outfit", sans-serif;
  color: var(--accent);
  font-size: 30px;
  letter-spacing: 2px;
  font-weight: 500;
  line-height: 1.6;
  
`;

export const TextTitle2 = styled.p`
font-family:  "Outfit", sans-serif;
  color: var(--accent);
  font-size: 30px;
  letter-spacing: 2px;
  font-weight: 500;
  line-height: 1.6;
`;

export const TextNav = styled.p`
font-family:  "Outfit", sans-serif;
  font-weight: 1000;
  line-height: 1.6;
`;


export const TextSubTitle = styled.p`
font-family:  "Outfit", sans-serif;
text-align: center;
margin-left: -30px;
  color: var(--accent);
  font-size: 15px;
  line-height: 1.8;
`;

export const TextSubTitle2 = styled.p`
font-family:  "Outfit", sans-serif;
  color: var(--accent);
  font-size: 2px;
  line-height: 1.6;
`;


export const TextDescription = styled.p`
font-family:  "Outfit", sans-serif;
  color: var(--accent);
  font-size: 25px;
  line-height: 1.6;
`;

export const StyledClickable = styled.div`
  :active {
    opacity: 0.6;
  }
`;
