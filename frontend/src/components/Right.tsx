interface RightProps {
    className: string
    size: number
    color: string
}

const Right: React.FC<RightProps> = ({ className, size, color }) => {
    return (
        <svg 
            className={className} 
            xmlns="http://www.w3.org/2000/svg" 
            x="0px" 
            y="0px" 
            width={size} 
            height={size} 
            viewBox="0 0 16 16"
            style={{ fill: color }}
        >
            <path d="M8 6L8 2L10 2L16 8L10 14L8 14L8 10L-1.74845e-07 10L-3.01991e-07 6L8 6Z"/>
        </svg>
    )
}

export default Right