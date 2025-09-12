interface LeftProps {
    className: string
    size: number
    color: string
}

const Left: React.FC<LeftProps> = ({ className, size, color }) => {
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
            <path d="M8 10L8 14L6 14L-2.62268e-07 8L6 2L8 2L8 6L16 6L16 10L8 10Z"/>
        </svg>
    )
}

export default Left